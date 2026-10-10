-- Admin fleet broadcast to riders and partners. Requires 109 (admin order
-- control audit helpers), 110/113 (riders.status, dispatch) and 117
-- (admin_control_audit, record_admin_control, admin_push_messages). Customer
-- push already exists (117); this adds the rider/partner side.
--
-- 1. admin_push_messages.audience gains the fleet values. The existing table's
--    customer_id guard already forces customer_id NULL for any non-'customer'
--    audience, so a fleet row never carries a customer.
-- 2. admin_control_audit.action gains 'admin_fleet_push_send'.
-- 3. admin_send_fleet_push resolves the audience to users.expo_push_token
--    (the column newOrderPush/riderDispatch read), records one audited
--    admin_push_messages row with the recipient_count, and RETURNS the tokens
--    for the backend to send best-effort via sendPushNotifications. Templates
--    are N/A: a fleet broadcast is free-text admin copy, not a per-event
--    template like the customer order-status notifications in 117.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- 1. Fleet audiences on the shared admin_push_messages table.
ALTER TABLE public.admin_push_messages DROP CONSTRAINT IF EXISTS admin_push_messages_audience_check;
ALTER TABLE public.admin_push_messages ADD CONSTRAINT admin_push_messages_audience_check
 CHECK(audience IN('customer','all_customers','all_riders','online_riders','partners'));

-- 2. Allow the new audit action.
ALTER TABLE public.admin_control_audit DROP CONSTRAINT IF EXISTS admin_control_audit_action_check;
ALTER TABLE public.admin_control_audit ADD CONSTRAINT admin_control_audit_action_check
 CHECK(action IN('customer_profile_update','checkout_settings_update','notification_template_update',
  'admin_push_send','admin_push_retry','admin_fleet_push_send'));

-- 3. Resolve + record + return tokens. Rate limit: one broadcast per audience
-- per minute (double-tap guard) and at most 20 per audience per hour. online
-- riders are those currently working (status online or on_delivery); all_riders
-- and partners are every approved rider / store owner with a device token.
CREATE OR REPLACE FUNCTION public.admin_send_fleet_push(p_audience text,p_title text,p_body text,p_admin_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE v_title text:=btrim(coalesce(p_title,'')); v_body text:=btrim(coalesce(p_body,''));
 m admin_push_messages; v_tokens text[]; n integer;
BEGIN
 IF p_audience NOT IN('all_riders','online_riders','partners') THEN
  RAISE EXCEPTION USING errcode='P0422',message='Unknown fleet audience'; END IF;
 IF coalesce(length(btrim(p_admin_email)),0) NOT BETWEEN 3 AND 320 THEN RAISE EXCEPTION USING errcode='P0422',message='Admin email required'; END IF;
 IF length(v_title) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION USING errcode='P0422',message='Title must be 1-80 characters'; END IF;
 IF length(v_body) NOT BETWEEN 1 AND 240 THEN RAISE EXCEPTION USING errcode='P0422',message='Message must be 1-240 characters'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('admin-fleet-push',120));
 IF EXISTS(SELECT 1 FROM admin_push_messages WHERE audience=p_audience AND created_at > now()-interval '1 minute') THEN
  RAISE EXCEPTION USING errcode='P0429',message='Wait a minute before sending to this audience again'; END IF;
 IF (SELECT count(*) FROM admin_push_messages WHERE audience=p_audience AND created_at > now()-interval '1 hour') >= 20 THEN
  RAISE EXCEPTION USING errcode='P0429',message='At most 20 broadcasts to this audience per hour'; END IF;

 -- Resolve the audience to live device tokens. role gates who; is_approved
 -- drops pending accounts; the token filter drops simulators and denied
 -- permissions. online_riders additionally requires an active, online rider row.
 IF p_audience='partners' THEN
  SELECT array_agg(u.expo_push_token) INTO v_tokens FROM users u
   WHERE u.role='store_owner' AND u.is_approved AND u.deletion_completed_at IS NULL AND u.expo_push_token IS NOT NULL;
 ELSIF p_audience='all_riders' THEN
  SELECT array_agg(u.expo_push_token) INTO v_tokens FROM users u
   WHERE u.role='rider' AND u.is_approved AND u.deletion_completed_at IS NULL AND u.expo_push_token IS NOT NULL;
 ELSE
  SELECT array_agg(u.expo_push_token) INTO v_tokens FROM users u JOIN riders r ON r.user_id=u.id
   WHERE u.role='rider' AND u.is_approved AND u.deletion_completed_at IS NULL AND u.expo_push_token IS NOT NULL
    AND r.is_active AND r.status IN('online','on_delivery');
 END IF;
 v_tokens:=coalesce(v_tokens,ARRAY[]::text[]);
 n:=array_length(v_tokens,1); IF n IS NULL THEN n:=0; END IF;

 INSERT INTO admin_push_messages(audience,customer_id,title,body,recipient_count,admin_email)
 VALUES(p_audience,NULL,v_title,v_body,n,lower(btrim(p_admin_email))) RETURNING * INTO m;
 PERFORM record_admin_control('admin_fleet_push_send',p_audience,
  jsonb_build_object('message_id',m.id,'title',v_title,'body',v_body,'recipients',n),p_admin_email);
 RETURN jsonb_build_object('message_id',m.id,'recipient_count',n,'tokens',to_jsonb(v_tokens));
END $function$;
REVOKE ALL ON FUNCTION public.admin_send_fleet_push(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_fleet_push(text,text,text,text) TO service_role;

COMMIT;
