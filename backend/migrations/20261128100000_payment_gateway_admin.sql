-- Admin "Payment gateway" setting (razorpay | cashfree | split %), audited
-- like the other checkout settings. Needs 20261128090000_cashfree_gateway.sql.
-- WRITTEN, NOT APPLIED: apply only after review.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.admin_control_audit DROP CONSTRAINT admin_control_audit_action_check;
ALTER TABLE public.admin_control_audit ADD CONSTRAINT admin_control_audit_action_check CHECK(action IN(
 'customer_profile_update','checkout_settings_update','notification_template_update','admin_push_send','admin_push_retry',
 'admin_fleet_push_send','payment_incident_resolved','payment_gateway_update'));

CREATE OR REPLACE FUNCTION public.admin_update_payment_gateway(p_mode text,p_split_pct integer,p_admin_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE s platform_settings;
BEGIN
 IF p_mode IS NULL OR p_mode NOT IN ('razorpay','cashfree','split') THEN RAISE EXCEPTION USING errcode='P0422',message='Choose razorpay, cashfree or split'; END IF;
 IF p_split_pct IS NULL OR p_split_pct NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION USING errcode='P0422',message='Split must be 0 to 100 percent'; END IF;
 SELECT * INTO s FROM platform_settings ORDER BY id LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Platform settings row missing'; END IF;
 UPDATE platform_settings SET payment_gateway=p_mode,payment_gateway_split_pct=CASE WHEN p_mode='split' THEN p_split_pct ELSE 0 END,updated_at=now() WHERE id=s.id;
 PERFORM record_admin_control('payment_gateway_update',s.id::text,jsonb_build_object(
  'from',jsonb_build_object('payment_gateway',s.payment_gateway,'split_pct',s.payment_gateway_split_pct),
  'to',jsonb_build_object('payment_gateway',p_mode,'split_pct',CASE WHEN p_mode='split' THEN p_split_pct ELSE 0 END)),p_admin_email);
 RETURN jsonb_build_object('payment_gateway',p_mode,'payment_gateway_split_pct',CASE WHEN p_mode='split' THEN p_split_pct ELSE 0 END);
END $function$;
REVOKE ALL ON FUNCTION public.admin_update_payment_gateway(text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_gateway(text,integer,text) TO service_role;

-- Reconciliation: one row per paid checkout with its gateway, provider ids
-- and whether it was a fallback. Service role only.
CREATE OR REPLACE VIEW public.admin_payment_reconciliation WITH (security_invoker=true) AS
SELECT s.kind, s.target_id, s.payment_provider, s.provider_order_id, s.fallback_from, s.created_at,
 coalesce(o.provider_payment_id, t.provider_payment_id) AS provider_payment_id,
 coalesce(o.total, t.total) AS total,
 coalesce(o.status, t.status) AS status,
 coalesce(o.refund_status, (SELECT min(l.refund_status) FROM orders l WHERE l.trip_id=t.id)) AS refund_status
FROM checkout_payment_sessions s
LEFT JOIN orders o ON s.kind='order' AND o.id=s.target_id
LEFT JOIN trips t ON s.kind='trip' AND t.id=s.target_id;
REVOKE ALL ON public.admin_payment_reconciliation FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.admin_payment_reconciliation TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
