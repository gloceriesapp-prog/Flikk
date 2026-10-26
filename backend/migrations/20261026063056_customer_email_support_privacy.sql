-- Deploy the name-only backend first, then apply this migration.
-- Removes the retired customer profile field; rider onboarding DOB is separate.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE OR REPLACE FUNCTION public.complete_customer_deletion(p_id uuid,p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
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
 UPDATE public.users SET phone='deleted:'||id::text,name=null,expo_push_token=null,deletion_completed_at=now() WHERE id=r.customer_id;
 DELETE FROM customer_push_devices WHERE customer_id=r.customer_id;
 DELETE FROM wishlist_items WHERE customer_id=r.customer_id;
 UPDATE addresses a SET deleted_at=coalesce(deleted_at,now()),is_default=false WHERE user_id=r.customer_id;
 UPDATE addresses a SET line1='Address removed',landmark=null,recipient_name='Deleted customer',recipient_phone=null,delivery_instructions=null,latitude=null,longitude=null
 WHERE user_id=r.customer_id AND NOT EXISTS(SELECT 1 FROM orders WHERE address_id=a.id) AND NOT EXISTS(SELECT 1 FROM trips WHERE address_id=a.id);
 UPDATE customer_deletion_requests SET status='completed',completed_at=now() WHERE id=r.id;
END $$;

ALTER TABLE public.users DROP COLUMN IF EXISTS birthday;

-- Keep the old RPC signature as a safe error for old installations.
CREATE OR REPLACE FUNCTION public.create_customer_ticket(p_customer_id uuid,p_request_id uuid,p_order_id uuid,p_trip_id uuid,p_category text,p_message text) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 RAISE EXCEPTION USING ERRCODE='P0410', MESSAGE='Customer support has moved to email';
END $$;
REVOKE ALL ON FUNCTION public.create_customer_ticket(uuid,uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_ticket(uuid,uuid,uuid,uuid,text,text) TO service_role;

-- Preserve historical conversations but prevent new customer chat through
-- direct writes or shared reply RPCs. Partner and rider support stays active.
CREATE FUNCTION public.guard_email_only_customer_support() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='support_tickets' THEN
  IF NEW.requester_role='customer' THEN
   RAISE EXCEPTION USING ERRCODE='P0410', MESSAGE='Customer support has moved to email';
  END IF;
 ELSE
  IF NEW.actor_role='customer' OR EXISTS (
   SELECT 1 FROM public.support_tickets WHERE id=NEW.ticket_id AND requester_role='customer'
  ) THEN
   RAISE EXCEPTION USING ERRCODE='P0410', MESSAGE='Customer support has moved to email';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_email_only_customer_support() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER customer_support_email_only BEFORE INSERT ON public.support_tickets
 FOR EACH ROW EXECUTE FUNCTION public.guard_email_only_customer_support();
CREATE TRIGGER customer_messages_email_only BEFORE INSERT ON public.support_messages
 FOR EACH ROW EXECUTE FUNCTION public.guard_email_only_customer_support();
COMMIT;
