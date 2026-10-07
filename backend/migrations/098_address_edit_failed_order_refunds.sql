BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Address book: owner-scoped edit, and create-as-default in ONE transaction so
-- a retry after a failed follow-up "set default" can no longer duplicate rows.
CREATE OR REPLACE FUNCTION public.manage_customer_address(p_customer uuid,p_action text,p_id uuid DEFAULT null,p_data jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result addresses; replacement uuid; make_default boolean:=coalesce((p_data->>'make_default')::boolean,false);
BEGIN
 PERFORM 1 FROM users WHERE id=p_customer AND role='customer' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Customer required'; END IF;
 IF p_action IN('create','update') THEN
  IF coalesce(btrim(p_data->>'line1'),'')='' OR coalesce(btrim(p_data->>'recipient_name'),'')='' THEN RAISE EXCEPTION 'Address and receiver required'; END IF;
  IF (p_data->>'latitude') IS NULL OR (p_data->>'longitude') IS NULL
   OR (p_data->>'latitude')::numeric NOT BETWEEN -90 AND 90 OR (p_data->>'longitude')::numeric NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid location'; END IF;
 END IF;
 IF p_action='create' THEN
  make_default:=make_default OR NOT EXISTS(SELECT 1 FROM addresses WHERE user_id=p_customer AND deleted_at IS NULL);
  IF make_default THEN UPDATE addresses SET is_default=false WHERE user_id=p_customer AND is_default AND deleted_at IS NULL; END IF;
  INSERT INTO addresses(user_id,zone_id,label,line1,landmark,recipient_name,recipient_phone,delivery_instructions,latitude,longitude,is_default)
  VALUES(p_customer,(p_data->>'zone_id')::uuid,coalesce(nullif(btrim(p_data->>'label'),''),'Home'),btrim(p_data->>'line1'),nullif(btrim(p_data->>'landmark'),''),
   btrim(p_data->>'recipient_name'),nullif(btrim(p_data->>'recipient_phone'),''),nullif(btrim(p_data->>'delivery_instructions'),''),
   (p_data->>'latitude')::numeric,(p_data->>'longitude')::numeric,make_default) RETURNING * INTO result;
 ELSIF p_action IN('default','delete','update') THEN
  SELECT * INTO result FROM addresses WHERE id=p_id AND user_id=p_customer AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN null; END IF;
  IF p_action='update' THEN
   -- Placed orders keep their own delivery snapshot (migration 087); editing
   -- only changes where future checkouts deliver.
   UPDATE addresses SET zone_id=coalesce((p_data->>'zone_id')::uuid,zone_id),label=coalesce(nullif(btrim(p_data->>'label'),''),'Home'),
    line1=btrim(p_data->>'line1'),landmark=nullif(btrim(p_data->>'landmark'),''),recipient_name=btrim(p_data->>'recipient_name'),
    recipient_phone=nullif(btrim(p_data->>'recipient_phone'),''),delivery_instructions=nullif(btrim(p_data->>'delivery_instructions'),''),
    latitude=(p_data->>'latitude')::numeric,longitude=(p_data->>'longitude')::numeric
   WHERE id=p_id RETURNING * INTO result;
  ELSIF p_action='default' THEN
   UPDATE addresses SET is_default=false WHERE user_id=p_customer AND is_default AND deleted_at IS NULL;
   UPDATE addresses SET is_default=true WHERE id=p_id RETURNING * INTO result;
  ELSE
   UPDATE addresses SET deleted_at=now(),is_default=false WHERE id=p_id RETURNING * INTO result;
   IF NOT EXISTS(SELECT 1 FROM addresses WHERE user_id=p_customer AND deleted_at IS NULL AND is_default) THEN
    SELECT id INTO replacement FROM addresses WHERE user_id=p_customer AND deleted_at IS NULL ORDER BY id LIMIT 1;
    UPDATE addresses SET is_default=true WHERE id=replacement;
   END IF;
  END IF;
 ELSE RAISE EXCEPTION 'Invalid address action'; END IF;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION manage_customer_address(uuid,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION manage_customer_address(uuid,text,uuid,jsonb) TO service_role;

-- Failed single-order deliveries that were paid online now refund
-- automatically through the same durable queue as cancellations (080).
-- Idempotent: order_refund_jobs.order_id is UNIQUE, so the trigger, the
-- admin's request_order_refund and retries all converge on one job — an admin
-- manual refund cannot double-refund. Trips are untouched: a failed trip keeps
-- the explicit admin-approved amount (approve_failed_trip_refund, 086) because
-- its payment is shared across legs.
CREATE OR REPLACE FUNCTION public.queue_cancelled_order_refund() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.trip_id IS NULL AND (NEW.status='cancelled' OR (NEW.status='failed' AND NEW.payment_method='online'))
  AND NEW.razorpay_payment_id IS NOT NULL AND NEW.total>0 THEN
  IF NOT EXISTS(SELECT 1 FROM order_refund_jobs WHERE order_id=NEW.id) THEN
  INSERT INTO order_refund_jobs(order_id,payment_id,target_paise,provider_refund_id,status)
  VALUES(NEW.id,NEW.razorpay_payment_id,round(NEW.total*100)::bigint,NEW.razorpay_refund_id,
   CASE WHEN NEW.refund_status='completed' THEN 'completed' ELSE 'queued' END) ON CONFLICT(order_id) DO NOTHING;
  END IF;
  IF NEW.refund_status='none' THEN NEW.refund_status:='processing'; END IF;
 END IF;
 RETURN NEW;
END $$;
-- No backfill of historical failed orders: those may already have been
-- settled by hand; admins enqueue them explicitly via request_order_refund.
REVOKE ALL ON FUNCTION queue_cancelled_order_refund() FROM PUBLIC,anon,authenticated;
COMMIT;
