BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE TABLE public.order_refund_jobs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
 payment_id text NOT NULL,target_paise bigint NOT NULL CHECK(target_paise>0),
 request_key uuid NOT NULL DEFAULT gen_random_uuid(),request_paise bigint CHECK(request_paise>0 AND request_paise<=target_paise),
 provider_refund_id text,status text NOT NULL DEFAULT 'queued' CHECK(status IN('queued','processing','completed','failed')),
 lease_token uuid,lease_until timestamptz,next_attempt_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0,last_error text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_refund_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON order_refund_jobs FROM PUBLIC,anon,authenticated;
GRANT ALL ON order_refund_jobs TO service_role;
CREATE INDEX order_refund_jobs_age ON order_refund_jobs(created_at) WHERE status IN('queued','processing');
CREATE INDEX order_refund_jobs_due ON order_refund_jobs(next_attempt_at) WHERE status IN('queued','processing');
CREATE FUNCTION public.queue_cancelled_order_refund() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.trip_id IS NULL AND NEW.status='cancelled' AND NEW.razorpay_payment_id IS NOT NULL AND NEW.total>0 THEN
  IF NOT EXISTS(SELECT 1 FROM order_refund_jobs WHERE order_id=NEW.id) THEN
  INSERT INTO order_refund_jobs(order_id,payment_id,target_paise,provider_refund_id,status)
  VALUES(NEW.id,NEW.razorpay_payment_id,round(NEW.total*100)::bigint,NEW.razorpay_refund_id,
   CASE WHEN NEW.refund_status='completed' THEN 'completed' ELSE 'queued' END) ON CONFLICT(order_id) DO NOTHING;
  END IF;
  IF NEW.refund_status='none' THEN NEW.refund_status:='processing'; END IF;
 END IF;
 RETURN NEW;
END $$;
-- Before trigger = cancellation/payment recording AND refund intent commit together.
CREATE TRIGGER atomic_refund_intent BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION queue_cancelled_order_refund();
-- Recover cancelled, paid orders that crashed before the old refund call.
INSERT INTO order_refund_jobs(order_id,payment_id,target_paise,provider_refund_id,status)
 SELECT id,razorpay_payment_id,round(total*100)::bigint,razorpay_refund_id,
 CASE WHEN refund_status='completed' THEN 'completed' ELSE 'queued' END
 FROM orders WHERE trip_id IS NULL AND status='cancelled' AND razorpay_payment_id IS NOT NULL AND total>0;
UPDATE orders SET refund_status='processing' WHERE trip_id IS NULL AND status='cancelled' AND razorpay_payment_id IS NOT NULL AND total>0 AND refund_status='none';
CREATE FUNCTION public.claim_order_refunds() RETURNS SETOF order_refund_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 RETURN QUERY WITH due AS(SELECT id FROM order_refund_jobs WHERE status IN('queued','processing') AND next_attempt_at<=now()
 AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at,id LIMIT 20 FOR UPDATE SKIP LOCKED)
 UPDATE order_refund_jobs j SET lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1
 FROM due WHERE j.id=due.id RETURNING j.*;
END $$;
CREATE FUNCTION public.save_order_refund(p_id uuid,p_lease uuid,p_patch jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j order_refund_jobs;
BEGIN
 SELECT * INTO j FROM order_refund_jobs WHERE id=p_id AND lease_token=p_lease FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF j.request_paise IS NOT NULL AND p_patch ? 'request_paise' AND (p_patch->>'request_paise')::bigint IS DISTINCT FROM j.request_paise THEN
  RAISE EXCEPTION 'Frozen refund amount cannot change'; END IF;
 UPDATE order_refund_jobs SET
 request_paise=coalesce((p_patch->>'request_paise')::bigint,request_paise),
 provider_refund_id=coalesce(p_patch->>'provider_refund_id',provider_refund_id),
 status=coalesce(p_patch->>'status',status),last_error=p_patch->>'last_error',
 next_attempt_at=coalesce((p_patch->>'next_attempt_at')::timestamptz,next_attempt_at),
 lease_token=CASE WHEN (p_patch->>'release')::boolean THEN null ELSE lease_token END,
 lease_until=CASE WHEN (p_patch->>'release')::boolean THEN null ELSE lease_until END,updated_at=now()
 WHERE id=j.id RETURNING * INTO j;
 IF j.status IN('processing','completed','failed') THEN
  UPDATE orders SET refund_status=j.status,razorpay_refund_id=j.provider_refund_id,
    refunded_at=CASE WHEN j.status='completed' THEN coalesce(refunded_at,now()) ELSE refunded_at END
  WHERE id=j.order_id AND refund_status<>'completed';
 END IF;
 RETURN true;
END $$;
CREATE FUNCTION public.retry_order_refund(p_order uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j order_refund_jobs;
BEGIN
 SELECT * INTO j FROM order_refund_jobs WHERE order_id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No durable refund intent'; END IF;
 IF j.status='failed' THEN
  -- Only a confirmed failed provider refund is a new financial operation.
  -- Unknown outcomes keep the original key/body and are reconciled by worker.
  UPDATE order_refund_jobs SET status='queued',next_attempt_at=now(),last_error=null,
   request_key=CASE WHEN last_error='Provider refund failed' THEN gen_random_uuid() ELSE request_key END,
   request_paise=CASE WHEN last_error='Provider refund failed' THEN null ELSE request_paise END,
   provider_refund_id=CASE WHEN last_error='Provider refund failed' THEN null ELSE provider_refund_id END
  WHERE id=j.id;
  UPDATE orders SET refund_status='processing',razorpay_refund_id=CASE WHEN j.last_error='Provider refund failed' THEN null ELSE razorpay_refund_id END WHERE id=p_order AND refund_status<>'completed';
 END IF;
END $$;
CREATE FUNCTION public.request_order_refund(p_order uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o orders;
BEGIN
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND OR o.trip_id IS NOT NULL OR o.status NOT IN('failed','cancelled') OR o.razorpay_payment_id IS NULL OR o.total<=0 THEN
  RAISE EXCEPTION 'Order is not eligible for a single-order refund'; END IF;
 INSERT INTO order_refund_jobs(order_id,payment_id,target_paise,provider_refund_id,status)
 VALUES(o.id,o.razorpay_payment_id,round(o.total*100)::bigint,o.razorpay_refund_id,
 CASE WHEN o.refund_status='completed' THEN 'completed' ELSE 'queued' END) ON CONFLICT(order_id) DO NOTHING;
 PERFORM retry_order_refund(o.id);
 UPDATE orders SET refund_status='processing' WHERE id=o.id AND refund_status<>'completed';
END $$;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND tgname='orders_refund_history') THEN
  DROP TRIGGER orders_refund_history ON orders;
  CREATE TRIGGER orders_refund_history BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION record_order_refund_update();
 END IF;
END $$;
-- Late trip captures must not depend on a follow-up API enqueue call.
CREATE FUNCTION public.ensure_trip_refund_intent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status='cancelled' AND NEW.razorpay_payment_id IS NOT NULL AND NEW.total>0 THEN
  PERFORM enqueue_trip_refund(NEW.id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER atomic_trip_refund AFTER UPDATE OF status,razorpay_payment_id ON trips FOR EACH ROW EXECUTE FUNCTION ensure_trip_refund_intent();
INSERT INTO trip_refunds(trip_id,payment_id,target_paise)
 SELECT id,razorpay_payment_id,round(total*100)::bigint FROM trips
 WHERE status='cancelled' AND razorpay_payment_id IS NOT NULL AND total>0 ON CONFLICT(trip_id) DO NOTHING;
CREATE FUNCTION public.record_atomic_rider_earning() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE fee numeric;
BEGIN
 IF NEW.status NOT IN('delivered','failed') OR OLD.status=NEW.status THEN RETURN NEW; END IF;
 IF NEW.rider_id IS NULL THEN RAISE EXCEPTION 'Completion requires assigned rider'; END IF;
 IF NEW.trip_id IS NULL THEN
  INSERT INTO rider_earnings(rider_id,order_id,amount) VALUES(NEW.rider_id,NEW.id,NEW.delivery_fee) ON CONFLICT DO NOTHING;
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.trip_id::text,790));
  IF NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status<>'delivered') THEN
   IF EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND rider_id IS DISTINCT FROM NEW.rider_id) THEN
    RAISE EXCEPTION 'Trip has inconsistent rider assignments'; END IF;
   SELECT delivery_fee INTO STRICT fee FROM trips WHERE id=NEW.trip_id;
   INSERT INTO rider_earnings(rider_id,order_id,trip_id,amount) VALUES(NEW.rider_id,NEW.id,NEW.trip_id,fee) ON CONFLICT DO NOTHING;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER atomic_rider_earning AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION record_atomic_rider_earning();
-- Repair previously missing ledger rows; unique indexes prevent double pay.
INSERT INTO rider_earnings(rider_id,order_id,amount)
 SELECT rider_id,id,delivery_fee FROM orders WHERE trip_id IS NULL AND status IN('delivered','failed') AND rider_id IS NOT NULL
 ON CONFLICT DO NOTHING;
INSERT INTO rider_earnings(rider_id,order_id,trip_id,amount)
 SELECT DISTINCT ON(o.trip_id) o.rider_id,o.id,o.trip_id,t.delivery_fee FROM orders o JOIN trips t ON t.id=o.trip_id
 WHERE o.status='delivered' AND o.rider_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM orders sibling WHERE sibling.trip_id=o.trip_id AND (sibling.status<>'delivered' OR sibling.rider_id IS DISTINCT FROM o.rider_id))
 ORDER BY o.trip_id,o.id ON CONFLICT DO NOTHING;
REVOKE ALL ON FUNCTION queue_cancelled_order_refund(),claim_order_refunds(),save_order_refund(uuid,uuid,jsonb),retry_order_refund(uuid),record_atomic_rider_earning(),request_order_refund(uuid),ensure_trip_refund_intent() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION claim_order_refunds(),save_order_refund(uuid,uuid,jsonb),retry_order_refund(uuid),request_order_refund(uuid) TO service_role;
COMMIT;
