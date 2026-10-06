BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE TABLE public.customer_push_receipts(id text PRIMARY KEY,notification_id uuid NOT NULL REFERENCES customer_notifications(id),customer_id uuid NOT NULL REFERENCES users(id),installation_id uuid NOT NULL,device_revision bigint NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','confirmed','failed')),attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',lease_token uuid,lease_until timestamptz,last_error text,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE customer_push_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON customer_push_receipts FROM PUBLIC,anon,authenticated;
GRANT ALL ON customer_push_receipts TO service_role;
CREATE INDEX customer_push_receipts_due ON customer_push_receipts(next_attempt_at) WHERE status='pending';
CREATE FUNCTION public.claim_push_receipts() RETURNS SETOF customer_push_receipts LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH due AS(SELECT id FROM customer_push_receipts WHERE status='pending' AND next_attempt_at<=now() AND(lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at,id LIMIT 50 FOR UPDATE SKIP LOCKED)
 UPDATE customer_push_receipts r SET lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=attempts+1 FROM due WHERE r.id=due.id RETURNING r.*;
$$;
CREATE FUNCTION public.save_push_receipt(p_id text,p_lease uuid,p_status text,p_error text DEFAULT null) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r customer_push_receipts;
BEGIN
 SELECT * INTO r FROM customer_push_receipts WHERE id=p_id AND lease_token=p_lease FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_status NOT IN('pending','confirmed','failed') THEN RAISE EXCEPTION 'Invalid receipt status'; END IF;
 UPDATE customer_push_receipts SET status=CASE WHEN p_status='pending' AND(attempts>=6 OR created_at<now()-interval '24 hours') THEN 'failed' ELSE p_status END,
 next_attempt_at=now()+interval '15 minutes',lease_token=null,lease_until=null,last_error=p_error WHERE id=r.id;
 IF p_error='DeviceNotRegistered' THEN
  -- Never remove a newly rotated token because an old push receipt arrived.
  UPDATE customer_push_devices SET token='disabled:'||installation_id::text WHERE installation_id=r.installation_id AND customer_id=r.customer_id AND revision=r.device_revision;
 END IF;
 RETURN true;
END $$;
CREATE TABLE public.customer_deletion_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),customer_id uuid NOT NULL REFERENCES users(id),status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','rejected','completed')),
 reason text NOT NULL DEFAULT '',review_note text,reviewer_id uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz,completed_at timestamptz);
CREATE UNIQUE INDEX customer_one_deletion_request ON customer_deletion_requests(customer_id) WHERE status IN('pending','approved');
ALTER TABLE customer_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON customer_deletion_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON customer_deletion_requests TO service_role;
CREATE INDEX customer_deletion_requests_queue ON customer_deletion_requests(created_at,id) WHERE status IN('pending','approved');
ALTER TABLE users ADD COLUMN deletion_completed_at timestamptz;
CREATE FUNCTION public.request_customer_deletion(p_customer uuid,p_reason text) RETURNS customer_deletion_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result customer_deletion_requests;
BEGIN
 PERFORM 1 FROM users WHERE id=p_customer AND role='customer' AND deletion_completed_at IS NULL FOR UPDATE;
 IF NOT FOUND OR length(p_reason)>1000 THEN RAISE EXCEPTION 'Invalid deletion request'; END IF;
 SELECT * INTO result FROM customer_deletion_requests WHERE customer_id=p_customer AND status IN('pending','approved');
 IF FOUND THEN RETURN result; END IF;
 INSERT INTO customer_deletion_requests(customer_id,reason) VALUES(p_customer,p_reason) RETURNING * INTO result;RETURN result;
END $$;
CREATE FUNCTION public.review_customer_deletion(p_id uuid,p_actor uuid,p_approve boolean,p_note text) RETURNS customer_deletion_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result customer_deletion_requests; customer uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor AND role='admin') OR coalesce(length(btrim(p_note)),0) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Admin and review note required'; END IF;
 SELECT customer_id INTO customer FROM customer_deletion_requests WHERE id=p_id;
 PERFORM 1 FROM users WHERE id=customer FOR UPDATE;
 SELECT * INTO result FROM customer_deletion_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request unavailable'; END IF;
 IF result.status='completed' THEN RETURN result; END IF;
 IF result.status='approved' AND NOT p_approve THEN RAISE EXCEPTION 'Approved identity removal cannot be rejected'; END IF;
 IF result.status NOT IN('pending','approved') THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
 IF p_approve AND (EXISTS(SELECT 1 FROM orders WHERE customer_id=customer AND(status IN('placed','packed','out_for_delivery') OR(status IN('cancelled','failed') AND razorpay_payment_id IS NOT NULL AND refund_status IS DISTINCT FROM 'completed')))
  OR EXISTS(SELECT 1 FROM support_tickets WHERE customer_id=customer AND status IN('open','in_progress'))) THEN RAISE EXCEPTION 'Resolve active orders, refunds and support before deletion'; END IF;
 UPDATE customer_deletion_requests SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,review_note=p_note,reviewer_id=p_actor,reviewed_at=now() WHERE id=p_id RETURNING * INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.guard_customer_deletion_checkout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM 1 FROM users WHERE id=NEW.customer_id AND deletion_completed_at IS NULL FOR SHARE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM customer_deletion_requests WHERE customer_id=NEW.customer_id AND status='approved') THEN RAISE EXCEPTION 'Account deletion is being processed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER orders_customer_deletion_guard BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION guard_customer_deletion_checkout();
CREATE FUNCTION public.complete_customer_deletion(p_id uuid,p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE r customer_deletion_requests; customer uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_actor AND role='admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT customer_id INTO customer FROM customer_deletion_requests WHERE id=p_id;
 -- Match review/checkout lock ordering so concurrent review retries cannot deadlock.
 PERFORM 1 FROM public.users WHERE id=customer FOR UPDATE;
 SELECT * INTO r FROM customer_deletion_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request unavailable'; END IF;
 IF r.status='completed' THEN RETURN; END IF;
 IF r.status<>'approved' OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=r.customer_id AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Disable the verified auth identity before completion'; END IF;
 -- Retain historical fulfilment/payment records; remove reusable identity
 -- and address-book entries that are not referenced by an order or trip.
 UPDATE public.users SET phone='deleted:'||id::text,name=null,birthday=null,expo_push_token=null,deletion_completed_at=now() WHERE id=r.customer_id;
 DELETE FROM customer_push_devices WHERE customer_id=r.customer_id;
 DELETE FROM wishlist_items WHERE customer_id=r.customer_id;
 UPDATE addresses a SET deleted_at=coalesce(deleted_at,now()),is_default=false WHERE user_id=r.customer_id;
 UPDATE addresses a SET line1='Address removed',landmark=null,recipient_name='Deleted customer',recipient_phone=null,delivery_instructions=null,latitude=null,longitude=null
 WHERE user_id=r.customer_id AND NOT EXISTS(SELECT 1 FROM orders WHERE address_id=a.id) AND NOT EXISTS(SELECT 1 FROM trips WHERE address_id=a.id);
 UPDATE customer_deletion_requests SET status='completed',completed_at=now() WHERE id=r.id;
END $$;
REVOKE ALL ON FUNCTION claim_push_receipts(),save_push_receipt(text,uuid,text,text),request_customer_deletion(uuid,text),review_customer_deletion(uuid,uuid,boolean,text),guard_customer_deletion_checkout(),complete_customer_deletion(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION claim_push_receipts(),save_push_receipt(text,uuid,text,text),request_customer_deletion(uuid,text),review_customer_deletion(uuid,uuid,boolean,text),complete_customer_deletion(uuid,uuid) TO service_role;
COMMIT;
