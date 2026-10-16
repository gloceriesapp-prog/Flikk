-- S2S UPI creation is claimed durably before the external, non-idempotent POST.
-- A lost provider response stays claimed: elapsed time alone cannot prove no
-- payment was created. Only an explicitly verified failed payment may be replaced.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
ALTER TABLE public.checkout_payment_sessions ADD COLUMN IF NOT EXISTS upi_claim_token uuid;
CREATE TABLE public.customer_payment_contacts (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (length(email)<=254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    AND email !~* '^login\+.*@gloceries\.com$')
);
ALTER TABLE public.customer_payment_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_payment_contacts FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.customer_payment_contacts TO service_role;

CREATE FUNCTION public.claim_checkout_upi_intent(
  p_customer_id uuid, p_kind text, p_target_id uuid, p_provider_order_id text,
  p_claim_token uuid, p_replace_payment_id text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; s public.checkout_payment_sessions; online boolean;
BEGIN
  IF p_kind='order' THEN
    SELECT to_jsonb(o) INTO r FROM public.orders o WHERE o.id=p_target_id FOR UPDATE;
    online:=r->>'payment_method'='online' AND r->>'trip_id' IS NULL;
  ELSIF p_kind='trip' THEN
    SELECT to_jsonb(t) INTO r FROM public.trips t WHERE t.id=p_target_id FOR UPDATE;
    online:=EXISTS(SELECT 1 FROM public.orders WHERE trip_id=p_target_id AND payment_method='online')
      AND NOT EXISTS(SELECT 1 FROM public.orders WHERE trip_id=p_target_id AND status IN ('cancelled','failed'));
  ELSE RAISE EXCEPTION 'Invalid kind'; END IF;
  IF r IS NULL OR r->>'customer_id' IS DISTINCT FROM p_customer_id::text THEN
    RAISE EXCEPTION 'Not your checkout' USING errcode='P0403'; END IF;
  IF NOT coalesce(online,false) OR r->>'status'<>'placed' OR r->>'provider_payment_id' IS NOT NULL
    OR r->>'payment_provider' IS DISTINCT FROM 'razorpay'
    OR coalesce((r->>'reservation_expires_at')::timestamptz,'-infinity'::timestamptz)<=public.checkout_clock() THEN
    RAISE EXCEPTION 'Checkout is not payable' USING errcode='P0410'; END IF;
  SELECT * INTO s FROM public.checkout_payment_sessions WHERE kind=p_kind AND target_id=p_target_id FOR UPDATE;
  IF NOT FOUND OR s.customer_id<>p_customer_id OR s.payment_provider IS DISTINCT FROM 'razorpay'
    OR s.provider_order_id IS DISTINCT FROM p_provider_order_id OR p_claim_token IS NULL
    OR p_provider_order_id IS NULL OR p_provider_order_id !~ '^order_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Provider session mismatch'; END IF;
  IF p_replace_payment_id IS NOT NULL THEN
    -- The service verifies terminal failure with Razorpay before supplying this
    -- exact ID; the compare prevents a stale failure read replacing a newer attempt.
    IF s.upi_state IS DISTINCT FROM 'ready' OR s.upi_payment_id IS DISTINCT FROM p_replace_payment_id THEN
      RETURN jsonb_build_object('claimed',false,'session',to_jsonb(s),'expiresAt',r->>'reservation_expires_at'); END IF;
  ELSIF s.upi_state IS NOT NULL THEN
    RETURN jsonb_build_object('claimed',false,'session',to_jsonb(s),'expiresAt',r->>'reservation_expires_at');
  END IF;
  UPDATE public.checkout_payment_sessions SET upi_state='creating',upi_claim_token=p_claim_token,
    upi_claimed_at=public.checkout_clock(),upi_payment_id=NULL,upi_link=NULL
    WHERE kind=p_kind AND target_id=p_target_id RETURNING * INTO s;
  RETURN jsonb_build_object('claimed',true,'session',to_jsonb(s),'expiresAt',r->>'reservation_expires_at');
END $$;

CREATE FUNCTION public.attach_checkout_upi_intent(
  p_kind text,p_target_id uuid,p_provider_order_id text,p_claim_token uuid,p_payment_id text,p_link text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.checkout_payment_sessions;
BEGIN
  IF p_claim_token IS NULL OR p_payment_id IS NULL OR p_payment_id !~ '^pay_[A-Za-z0-9]+$' OR p_link IS NULL OR p_link NOT LIKE 'upi://pay?%' THEN
    RAISE EXCEPTION 'Invalid provider intent'; END IF;
  SELECT * INTO s FROM public.checkout_payment_sessions WHERE kind=p_kind AND target_id=p_target_id FOR UPDATE;
  IF NOT FOUND OR s.payment_provider IS DISTINCT FROM 'razorpay' OR s.provider_order_id IS DISTINCT FROM p_provider_order_id
    OR s.upi_claim_token IS DISTINCT FROM p_claim_token OR s.upi_state IS DISTINCT FROM 'creating' THEN
    RAISE EXCEPTION 'Provider intent claim mismatch'; END IF;
  -- Keep the provider reference even if cancellation/expiry won during the POST;
  -- late captures still reconcile into the existing atomic refund flow.
  UPDATE public.checkout_payment_sessions SET upi_state='ready',upi_payment_id=p_payment_id,upi_link=p_link
    WHERE kind=p_kind AND target_id=p_target_id RETURNING * INTO s;
  RETURN to_jsonb(s);
END $$;

REVOKE ALL ON FUNCTION public.claim_checkout_upi_intent(uuid,text,uuid,text,uuid,text),
  public.attach_checkout_upi_intent(text,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout_upi_intent(uuid,text,uuid,text,uuid,text),
  public.attach_checkout_upi_intent(text,uuid,text,uuid,text,text) TO service_role;
COMMIT;
