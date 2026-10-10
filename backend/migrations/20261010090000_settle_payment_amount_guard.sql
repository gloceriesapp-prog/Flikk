-- Issue #27: enforce the captured amount at the write boundary.
--
-- settle_checkout_payment previously trusted callers (validateCapturedPayment,
-- reconcileProvider) to have checked that the amount Cashfree captured equals
-- what this checkout costs. That invariant lived only in application code; a
-- caller bug could settle an order against a payment for the wrong amount.
--
-- This redefines the RPC to also take the provider-captured amount in paise
-- (p_expected_paise) and currency (p_currency), and to RAISE if either does
-- not match the order/trip's own stored total. Both are optional (DEFAULT
-- NULL) so the guard is skipped when a caller passes nothing — backward-safe
-- for any un-updated path — but every live caller now passes them.
--
-- Signature changes (adds params), so the old 3-arg function is dropped and
-- the new one created with its own grants. Body is otherwise identical to the
-- definition in 103_cashfree_payments.sql.

DROP FUNCTION IF EXISTS public.settle_checkout_payment(uuid,uuid,text);

CREATE FUNCTION public.settle_checkout_payment(p_order_id uuid, p_trip_id uuid, p_payment_id text, p_expected_paise bigint DEFAULT NULL, p_currency text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE o public.orders; t public.trips; rejected boolean; old_payment text;
BEGIN
  IF (p_order_id IS NULL)=(p_trip_id IS NULL) OR nullif(p_payment_id,'') IS NULL THEN RAISE EXCEPTION 'Invalid payment target'; END IF;
  IF p_currency IS NOT NULL AND upper(p_currency)<>'INR' THEN RAISE EXCEPTION 'settle_checkout_payment currency % not supported', p_currency; END IF;
  IF p_trip_id IS NOT NULL THEN
    SELECT * INTO t FROM public.trips WHERE id=p_trip_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
    -- Captured amount must equal the trip's own total. Checked before any
    -- idempotent early-return so a replay with a wrong amount is rejected too.
    IF p_expected_paise IS NOT NULL AND p_expected_paise<>round(t.total*100)::bigint THEN
      RAISE EXCEPTION 'settle_checkout_payment amount mismatch: captured % paise <> trip total % paise', p_expected_paise, round(t.total*100)::bigint;
    END IF;
    old_payment:=t.provider_payment_id;
    IF old_payment IS NOT NULL THEN
      IF old_payment<>p_payment_id THEN RAISE EXCEPTION 'Payment conflict'; END IF;
      RETURN jsonb_build_object('accepted',NOT t.checkout_payment_rejected,'total',t.total,'settled_now',false);
    END IF;
    PERFORM 1 FROM public.orders WHERE trip_id=t.id ORDER BY id FOR UPDATE;
    IF EXISTS(SELECT 1 FROM public.orders WHERE trip_id=t.id AND payment_method='cod') THEN
      -- Switched to cash on delivery: refund the late capture in full.
      SELECT payment_id INTO old_payment FROM public.trip_refunds WHERE trip_id=t.id;
      IF FOUND THEN
        IF old_payment<>p_payment_id THEN RAISE EXCEPTION 'Payment conflict'; END IF;
        RETURN jsonb_build_object('accepted',false,'total',t.total,'settled_now',false);
      END IF;
      INSERT INTO public.trip_refunds(trip_id,payment_id,target_paise) VALUES(t.id,p_payment_id,round(t.total*100)::bigint);
      RETURN jsonb_build_object('accepted',false,'total',t.total,'settled_now',true);
    END IF;
    rejected:=t.status='cancelled' OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id=t.id AND
      (status='cancelled' OR (payment_method='online' AND provider_payment_id IS NULL AND placed_at+interval '20 minutes'<=checkout_clock())));
    IF rejected THEN
      PERFORM 1 FROM public.products WHERE id IN(SELECT product_id FROM inventory_reservations WHERE order_id IN(SELECT id FROM public.orders WHERE trip_id=t.id) AND state IN ('held','committed')) ORDER BY id FOR UPDATE;
      UPDATE public.orders SET status='cancelled',cancel_reason='Payment arrived after checkout closed.' WHERE trip_id=t.id AND status IN ('placed','packed');
    END IF;
    UPDATE public.trips SET provider_payment_id=p_payment_id,checkout_payment_rejected=rejected,
      status=CASE WHEN rejected THEN 'cancelled' ELSE status END WHERE id=t.id;
    UPDATE public.orders SET provider_payment_id=p_payment_id,checkout_payment_rejected=rejected WHERE trip_id=t.id;
    RETURN jsonb_build_object('accepted',NOT rejected,'total',t.total,'settled_now',true);
  ELSE
    SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
    IF NOT FOUND OR o.trip_id IS NOT NULL THEN RAISE EXCEPTION 'Use the trip payment target'; END IF;
    IF p_expected_paise IS NOT NULL AND p_expected_paise<>round(o.total*100)::bigint THEN
      RAISE EXCEPTION 'settle_checkout_payment amount mismatch: captured % paise <> order total % paise', p_expected_paise, round(o.total*100)::bigint;
    END IF;
    IF o.provider_payment_id IS NOT NULL THEN
      IF o.provider_payment_id<>p_payment_id THEN RAISE EXCEPTION 'Payment conflict'; END IF;
      RETURN jsonb_build_object('accepted',NOT o.checkout_payment_rejected,'total',o.total,'settled_now',false);
    END IF;
    IF o.payment_method='cod' THEN
      -- Never write provider_payment_id onto a COD order: everything
      -- downstream reads it as "paid online". The refund job alone records it.
      SELECT payment_id INTO old_payment FROM public.order_refund_jobs WHERE order_id=o.id;
      IF FOUND THEN
        IF old_payment<>p_payment_id THEN RAISE EXCEPTION 'Payment conflict'; END IF;
        RETURN jsonb_build_object('accepted',false,'total',o.total,'settled_now',false);
      END IF;
      INSERT INTO public.order_refund_jobs(order_id,payment_id,target_paise) VALUES(o.id,p_payment_id,round(o.total*100)::bigint);
      UPDATE public.orders SET refund_status='processing' WHERE id=o.id AND refund_status='none';
      RETURN jsonb_build_object('accepted',false,'total',o.total,'settled_now',true);
    END IF;
    rejected:=o.status='cancelled' OR (o.payment_method='online' AND o.placed_at+interval '20 minutes'<=checkout_clock());
    IF rejected AND o.status IN ('placed','packed') THEN
      UPDATE public.orders SET status='cancelled',cancel_reason='Payment arrived after checkout closed.' WHERE id=o.id;
    END IF;
    -- 080's BEFORE UPDATE trigger queues the refund when rejected.
    UPDATE public.orders SET provider_payment_id=p_payment_id,checkout_payment_rejected=rejected WHERE id=o.id;
    RETURN jsonb_build_object('accepted',NOT rejected,'total',o.total,'settled_now',true);
  END IF;
END $function$;

REVOKE ALL ON FUNCTION public.settle_checkout_payment(uuid,uuid,text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_checkout_payment(uuid,uuid,text,bigint,text) TO service_role;
