-- Customer accounts, checkout settings and notifications for admin. Requires 001..112.
-- 1. admin_control_audit: append-only record of the admin writes below
--    (who, what, before/after), written in the same transaction as the write.
-- 2. admin_update_customer_profile(customer, name, email, admin): edits a
--    customer's name and contact email. Phone is the sign-in identity
--    (Supabase phone OTP) and is deliberately not editable here.
-- 3. platform_settings gains cod_enabled, online_payments_enabled and
--    min_order_value. The backend reads them at checkout (payments
--    availability, order/trip creation, quote); the env stays a hard kill for
--    online payment (no Cashfree keys = no online payment, whatever the row
--    says). admin_update_checkout_settings writes them, audited.
-- 4. customer_notification_templates: admin-editable title/body per order
--    status event, seeded with the text record_customer_order_notification
--    (latest: 103) had hard-coded. The trigger now reads the template and
--    falls back to the old literals when a row is missing. {order_number} in a
--    template is replaced with the order's number.
-- 5. Admin push through the existing outbox (customer_notifications):
--    order_id becomes nullable for admin messages (admin_message_id set
--    instead), admin_push_messages records each send, and
--    admin_send_customer_push queues one customer or every customer,
--    rate-limited and audited. last_error records why a push did not go out
--    (written by the backend worker); admin_retry_customer_notification
--    requeues an unsent row.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- 1. Audit trail.
CREATE TABLE IF NOT EXISTS public.admin_control_audit(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 action text NOT NULL CHECK(action IN('customer_profile_update','checkout_settings_update',
  'notification_template_update','admin_push_send','admin_push_retry')),
 target_id text,
 detail jsonb NOT NULL DEFAULT '{}'::jsonb,
 admin_email text NOT NULL CHECK(length(admin_email) BETWEEN 3 AND 320),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_control_audit_action ON public.admin_control_audit(action,created_at DESC);
CREATE INDEX IF NOT EXISTS admin_control_audit_target ON public.admin_control_audit(target_id,created_at DESC);
ALTER TABLE public.admin_control_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_control_audit FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.admin_control_audit TO service_role;

CREATE OR REPLACE FUNCTION public.record_admin_control(p_action text,p_target text,p_detail jsonb,p_admin_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
 IF coalesce(length(btrim(p_admin_email)),0) NOT BETWEEN 3 AND 320 THEN
  RAISE EXCEPTION USING errcode='P0422',message='Admin email required'; END IF;
 INSERT INTO admin_control_audit(action,target_id,detail,admin_email)
 VALUES(p_action,p_target,coalesce(p_detail,'{}'::jsonb),lower(btrim(p_admin_email)));
END $function$;
REVOKE ALL ON FUNCTION public.record_admin_control(text,text,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_control(text,text,jsonb,text) TO service_role;

-- 2. Customer profile edit.
CREATE OR REPLACE FUNCTION public.admin_update_customer_profile(p_customer uuid,p_name text,p_email text,p_admin_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE u users; v_name text:=nullif(btrim(coalesce(p_name,'')),''); v_email text:=lower(nullif(btrim(coalesce(p_email,'')),''));
BEGIN
 SELECT * INTO u FROM users WHERE id=p_customer AND role='customer' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Customer not found'; END IF;
 IF u.deletion_completed_at IS NOT NULL THEN RAISE EXCEPTION USING errcode='P0409',message='This account has been deleted'; END IF;
 IF v_name IS NULL OR length(v_name)>80 THEN RAISE EXCEPTION USING errcode='P0422',message='Name must be 1-80 characters'; END IF;
 IF v_email IS NOT NULL AND (length(v_email)>254 OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') THEN
  RAISE EXCEPTION USING errcode='P0422',message='Enter a valid email address'; END IF;
 IF u.name IS NOT DISTINCT FROM v_name AND u.email IS NOT DISTINCT FROM v_email THEN
  RETURN jsonb_build_object('id',u.id,'name',u.name,'email',u.email,'changed',false); END IF;
 UPDATE users SET name=v_name,email=v_email WHERE id=p_customer;
 PERFORM record_admin_control('customer_profile_update',p_customer::text,
  jsonb_build_object('from',jsonb_build_object('name',u.name,'email',u.email),'to',jsonb_build_object('name',v_name,'email',v_email)),p_admin_email);
 RETURN jsonb_build_object('id',u.id,'name',v_name,'email',v_email,'changed',true);
END $function$;
REVOKE ALL ON FUNCTION public.admin_update_customer_profile(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_customer_profile(uuid,text,text,text) TO service_role;

-- 3. Checkout settings on the admin-only platform_settings singleton (039).
ALTER TABLE public.platform_settings
 ADD COLUMN IF NOT EXISTS cod_enabled boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS online_payments_enabled boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS min_order_value numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_min_order_value_check;
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_min_order_value_check
 CHECK(min_order_value >= 0 AND min_order_value <= 100000);
ALTER TABLE public.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_payment_method_check;
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_payment_method_check
 CHECK(cod_enabled OR online_payments_enabled);

CREATE OR REPLACE FUNCTION public.admin_update_checkout_settings(p_cod boolean,p_online boolean,p_min_order numeric,p_admin_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE s platform_settings;
BEGIN
 IF p_cod IS NULL OR p_online IS NULL OR p_min_order IS NULL THEN RAISE EXCEPTION USING errcode='P0422',message='All checkout settings are required'; END IF;
 IF NOT (p_cod OR p_online) THEN RAISE EXCEPTION USING errcode='P0422',message='Keep at least one payment method on'; END IF;
 IF p_min_order < 0 OR p_min_order > 100000 OR p_min_order <> round(p_min_order,2) THEN
  RAISE EXCEPTION USING errcode='P0422',message='Minimum order must be between 0 and 100000 rupees'; END IF;
 SELECT * INTO s FROM platform_settings ORDER BY id LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Platform settings row missing'; END IF;
 UPDATE platform_settings SET cod_enabled=p_cod,online_payments_enabled=p_online,min_order_value=p_min_order,updated_at=now() WHERE id=s.id;
 PERFORM record_admin_control('checkout_settings_update',s.id::text,jsonb_build_object(
  'from',jsonb_build_object('cod_enabled',s.cod_enabled,'online_payments_enabled',s.online_payments_enabled,'min_order_value',s.min_order_value),
  'to',jsonb_build_object('cod_enabled',p_cod,'online_payments_enabled',p_online,'min_order_value',p_min_order)),p_admin_email);
 RETURN jsonb_build_object('cod_enabled',p_cod,'online_payments_enabled',p_online,'min_order_value',p_min_order);
END $function$;
REVOKE ALL ON FUNCTION public.admin_update_checkout_settings(boolean,boolean,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_checkout_settings(boolean,boolean,numeric,text) TO service_role;

-- 4. Notification templates.
CREATE TABLE IF NOT EXISTS public.customer_notification_templates(
 event text PRIMARY KEY CHECK(event IN('placed','packed','out_for_delivery','delivered','cancelled','failed')),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 80),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 240),
 default_title text NOT NULL,
 default_body text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text
);
ALTER TABLE public.customer_notification_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_notification_templates FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.customer_notification_templates TO service_role;
INSERT INTO public.customer_notification_templates(event,title,body,default_title,default_body) VALUES
 ('placed','Order received','Your shop is preparing your order.','Order received','Your shop is preparing your order.'),
 ('packed','Your order is packed','We are getting your delivery ready.','Your order is packed','We are getting your delivery ready.'),
 ('out_for_delivery','Your order is on the way','Open your order to follow its arrival.','Your order is on the way','Open your order to follow its arrival.'),
 ('delivered','Order delivered','Your delivery is complete. View your order details.','Order delivered','Your delivery is complete. View your order details.'),
 ('cancelled','Order cancelled','View your order for cancellation and payment updates.','Order cancelled','View your order for cancellation and payment updates.'),
 ('failed','Delivery update','Open your order for the latest delivery information.','Delivery update','Open your order for the latest delivery information.')
ON CONFLICT(event) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_update_notification_template(p_event text,p_title text,p_body text,p_admin_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE t customer_notification_templates; v_title text:=btrim(coalesce(p_title,'')); v_body text:=btrim(coalesce(p_body,''));
BEGIN
 SELECT * INTO t FROM customer_notification_templates WHERE event=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Unknown notification'; END IF;
 IF length(v_title) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION USING errcode='P0422',message='Title must be 1-80 characters'; END IF;
 IF length(v_body) NOT BETWEEN 1 AND 240 THEN RAISE EXCEPTION USING errcode='P0422',message='Message must be 1-240 characters'; END IF;
 UPDATE customer_notification_templates SET title=v_title,body=v_body,updated_at=now(),updated_by=lower(btrim(p_admin_email)) WHERE event=p_event;
 PERFORM record_admin_control('notification_template_update',p_event,jsonb_build_object(
  'from',jsonb_build_object('title',t.title,'body',t.body),'to',jsonb_build_object('title',v_title,'body',v_body)),p_admin_email);
 RETURN jsonb_build_object('event',p_event,'title',v_title,'body',v_body);
END $function$;
REVOKE ALL ON FUNCTION public.admin_update_notification_template(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_notification_template(text,text,text,text) TO service_role;

-- 103's trigger, reading the admin template (old literals as fallback).
CREATE OR REPLACE FUNCTION public.record_customer_order_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
declare heading text; copy text; tpl customer_notification_templates;
begin
 if TG_OP='UPDATE' then
  if new.status=old.status and not (new.status='placed' and old.provider_payment_id is null and new.provider_payment_id is not null) then return new; end if;
 end if;
 if new.status='placed' and new.payment_method='online' and new.provider_payment_id is null then return new; end if;
 case new.status
 when 'placed' then heading:='Order received'; copy:='Your shop is preparing your order.';
 when 'packed' then heading:='Your order is packed'; copy:='We are getting your delivery ready.';
 when 'out_for_delivery' then heading:='Your order is on the way'; copy:='Open your order to follow its arrival.';
 when 'delivered' then heading:='Order delivered'; copy:='Your delivery is complete. View your order details.';
 when 'cancelled' then heading:='Order cancelled'; copy:='View your order for cancellation and payment updates.';
 when 'failed' then heading:='Delivery update'; copy:='Open your order for the latest delivery information.';
 else return new;
 end case;
 select * into tpl from customer_notification_templates where event=new.status;
 if found then
  heading:=replace(tpl.title,'{order_number}',coalesce(new.order_number,''));
  copy:=replace(tpl.body,'{order_number}',coalesce(new.order_number,''));
 end if;
 insert into customer_notifications(customer_id,order_id,trip_id,event,title,body)
 values(new.customer_id,new.id,new.trip_id,new.status,heading,copy) on conflict(order_id,event) do nothing;
 return new;
end $function$;
REVOKE ALL ON FUNCTION public.record_customer_order_notification() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_order_notification() TO service_role;

-- 5. Admin push through the outbox.
CREATE TABLE IF NOT EXISTS public.admin_push_messages(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 audience text NOT NULL CHECK(audience IN('customer','all_customers')),
 customer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 80),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 240),
 recipient_count integer NOT NULL DEFAULT 0 CHECK(recipient_count >= 0),
 admin_email text NOT NULL CHECK(length(admin_email) BETWEEN 3 AND 320),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(audience='customer' OR customer_id IS NULL)
);
CREATE INDEX IF NOT EXISTS admin_push_messages_recent ON public.admin_push_messages(audience,created_at DESC);
ALTER TABLE public.admin_push_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_push_messages FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.admin_push_messages TO service_role;

ALTER TABLE public.customer_notifications
 ADD COLUMN IF NOT EXISTS admin_message_id uuid REFERENCES public.admin_push_messages(id) ON DELETE CASCADE,
 ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE public.customer_notifications ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.customer_notifications DROP CONSTRAINT IF EXISTS customer_notifications_source_check;
ALTER TABLE public.customer_notifications ADD CONSTRAINT customer_notifications_source_check
 CHECK(order_id IS NOT NULL OR admin_message_id IS NOT NULL);
ALTER TABLE public.customer_notifications DROP CONSTRAINT IF EXISTS customer_notifications_last_error_check;
ALTER TABLE public.customer_notifications ADD CONSTRAINT customer_notifications_last_error_check
 CHECK(last_error IS NULL OR length(last_error) <= 300);
CREATE UNIQUE INDEX IF NOT EXISTS customer_notifications_admin_message
 ON public.customer_notifications(admin_message_id,customer_id) WHERE admin_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS customer_notifications_outbox_recent ON public.customer_notifications(created_at DESC,id DESC);

-- Limits: one all-customers send per hour and three per day; 30 single-customer
-- sends per hour, at most 3 to the same customer per hour.
CREATE OR REPLACE FUNCTION public.admin_send_customer_push(p_title text,p_body text,p_customer uuid,p_admin_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE v_title text:=btrim(coalesce(p_title,'')); v_body text:=btrim(coalesce(p_body,'')); m admin_push_messages; n integer;
BEGIN
 IF coalesce(length(btrim(p_admin_email)),0) NOT BETWEEN 3 AND 320 THEN RAISE EXCEPTION USING errcode='P0422',message='Admin email required'; END IF;
 IF length(v_title) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION USING errcode='P0422',message='Title must be 1-80 characters'; END IF;
 IF length(v_body) NOT BETWEEN 1 AND 240 THEN RAISE EXCEPTION USING errcode='P0422',message='Message must be 1-240 characters'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('admin-customer-push',117));
 IF p_customer IS NULL THEN
  IF EXISTS(SELECT 1 FROM admin_push_messages WHERE audience='all_customers' AND created_at > now()-interval '1 hour') THEN
   RAISE EXCEPTION USING errcode='P0429',message='Only one message to all customers per hour'; END IF;
  IF (SELECT count(*) FROM admin_push_messages WHERE audience='all_customers' AND created_at > now()-interval '24 hours') >= 3 THEN
   RAISE EXCEPTION USING errcode='P0429',message='At most three messages to all customers per day'; END IF;
 ELSE
  PERFORM 1 FROM users WHERE id=p_customer AND role='customer' AND deletion_completed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Customer not found'; END IF;
  IF (SELECT count(*) FROM admin_push_messages WHERE audience='customer' AND created_at > now()-interval '1 hour') >= 30 THEN
   RAISE EXCEPTION USING errcode='P0429',message='At most 30 single-customer messages per hour'; END IF;
  IF (SELECT count(*) FROM admin_push_messages WHERE audience='customer' AND customer_id=p_customer AND created_at > now()-interval '1 hour') >= 3 THEN
   RAISE EXCEPTION USING errcode='P0429',message='At most three messages to this customer per hour'; END IF;
 END IF;
 INSERT INTO admin_push_messages(audience,customer_id,title,body,admin_email)
 VALUES(CASE WHEN p_customer IS NULL THEN 'all_customers' ELSE 'customer' END,p_customer,v_title,v_body,lower(btrim(p_admin_email)))
 RETURNING * INTO m;
 INSERT INTO customer_notifications(customer_id,order_id,trip_id,event,title,body,admin_message_id)
 SELECT u.id,NULL,NULL,'admin_message',v_title,v_body,m.id FROM users u
 WHERE u.role='customer' AND u.deletion_completed_at IS NULL AND (p_customer IS NULL OR u.id=p_customer);
 GET DIAGNOSTICS n = ROW_COUNT;
 UPDATE admin_push_messages SET recipient_count=n WHERE id=m.id;
 PERFORM record_admin_control('admin_push_send',coalesce(p_customer::text,'all_customers'),
  jsonb_build_object('message_id',m.id,'title',v_title,'body',v_body,'recipients',n),p_admin_email);
 RETURN jsonb_build_object('message_id',m.id,'recipients',n);
END $function$;
REVOKE ALL ON FUNCTION public.admin_send_customer_push(text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_customer_push(text,text,uuid,text) TO service_role;

-- Requeue an unsent row that is not leased right now. attempts stays >= 1 when
-- it was tried before, so the worker still skips devices whose earlier ticket
-- was accepted (customer_push_receipts).
CREATE OR REPLACE FUNCTION public.admin_retry_customer_notification(p_id uuid,p_admin_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE c customer_notifications;
BEGIN
 SELECT * INTO c FROM customer_notifications WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Notification not found'; END IF;
 IF c.push_sent_at IS NOT NULL THEN RAISE EXCEPTION USING errcode='P0409',message='This notification was already sent'; END IF;
 IF c.lease_until IS NOT NULL AND c.lease_until > now() THEN RAISE EXCEPTION USING errcode='P0409',message='This notification is being sent right now'; END IF;
 UPDATE customer_notifications SET attempts=least(attempts,1),next_attempt_at=now(),lease_token=NULL,lease_until=NULL,last_error=NULL WHERE id=p_id;
 PERFORM record_admin_control('admin_push_retry',p_id::text,jsonb_build_object('attempts',c.attempts,'last_error',c.last_error),p_admin_email);
END $function$;
REVOKE ALL ON FUNCTION public.admin_retry_customer_notification(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_retry_customer_notification(uuid,text) TO service_role;

COMMIT;
