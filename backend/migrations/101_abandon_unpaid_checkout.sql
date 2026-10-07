-- Requires 063, 064, 065, 080, 096. Prepared migration: deploy before the API
-- release that ships POST /payments/abandon.
-- 1. abandon_unpaid_checkout: a customer who backed out of the UPI app can
--    cancel the unpaid checkout or switch it to cash on delivery, atomically
--    against settlement/expiry (same lock order: trip -> legs by id -> products).
-- 2. settle_checkout_payment: a capture that lands AFTER a switch to COD is
--    never recorded as the order's payment (the rider would also collect cash);
--    it is queued for a full refund through the existing durable refund queues.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE OR REPLACE FUNCTION public.abandon_unpaid_checkout(p_customer_id uuid,p_kind text,p_target_id uuid,p_action text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.orders; t public.trips; legs uuid[]; opened timestamptz;
BEGIN
 IF p_action NOT IN('cancel','cod') THEN RAISE EXCEPTION 'Invalid abandon action'; END IF;
 IF p_kind='trip' THEN
  SELECT * INTO t FROM public.trips WHERE id=p_target_id FOR UPDATE;
  IF NOT FOUND OR t.customer_id<>p_customer_id THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Checkout not found'; END IF;
  PERFORM 1 FROM public.orders WHERE trip_id=t.id ORDER BY id FOR UPDATE;
  SELECT array_agg(id ORDER BY id),min(placed_at) INTO legs,opened FROM public.orders WHERE trip_id=t.id;
  IF legs IS NULL OR t.status<>'placed' OR t.razorpay_payment_id IS NOT NULL OR t.checkout_payment_rejected
   OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id=t.id AND (status<>'placed' OR payment_method<>'online' OR razorpay_payment_id IS NOT NULL)) THEN
   RAISE EXCEPTION USING ERRCODE='P0410',MESSAGE='Checkout is no longer awaiting payment'; END IF;
 ELSIF p_kind='order' THEN
  SELECT * INTO o FROM public.orders WHERE id=p_target_id FOR UPDATE;
  IF NOT FOUND OR o.customer_id<>p_customer_id OR o.trip_id IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Checkout not found'; END IF;
  IF o.status<>'placed' OR o.payment_method<>'online' OR o.razorpay_payment_id IS NOT NULL OR o.checkout_payment_rejected THEN
   RAISE EXCEPTION USING ERRCODE='P0410',MESSAGE='Checkout is no longer awaiting payment'; END IF;
  legs:=ARRAY[o.id]; opened:=o.placed_at;
 ELSE RAISE EXCEPTION 'Invalid checkout kind'; END IF;

 IF p_action='cod' THEN
  -- Same payable window as claim_checkout_payment: past it the held stock
  -- belongs to the expiry worker, and the customer re-orders from the cart.
  IF opened+interval '20 minutes'<=checkout_clock() THEN
   RAISE EXCEPTION USING ERRCODE='P0411',MESSAGE='Checkout window closed'; END IF;
  -- claim_checkout_payment now refuses (payment_method<>'online'), so no new
  -- provider order/UPI intent can start; the expiry batch skips COD rows.
  UPDATE public.orders SET payment_method='cod' WHERE id=ANY(legs);
  UPDATE public.inventory_reservations SET state='committed',expires_at=null WHERE order_id=ANY(legs) AND state='held';
 ELSIF p_kind='trip' THEN
  PERFORM cancel_customer_trip(t.id,p_customer_id,p_reason);
 ELSE
  PERFORM 1 FROM public.products WHERE id IN(SELECT product_id FROM public.inventory_reservations
   WHERE order_id=o.id AND state IN('held','committed')) ORDER BY id FOR UPDATE;
  -- Triggers release stock (063) and the unpaid promo redemption (083).
  UPDATE public.orders SET status='cancelled',cancel_reason=p_reason WHERE id=o.id;
 END IF;
 RETURN jsonb_build_object('action',p_action,'kind',p_kind,'target_id',p_target_id);
END $$;

-- 096's settlement plus the COD branch. Everything else is unchanged.
CREATE OR REPLACE FUNCTION public.settle_checkout_payment(p_order_id uuid,p_trip_id uuid,p_payment_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; t public.trips; rejected boolean; old_payment text;
BEGIN
  IF (p_order_id IS NULL)=(p_trip_id IS NULL) OR nullif(p_payment_id,'') IS NULL THEN RAISE EXCEPTION 'Invalid payment target'; END IF;
  IF p_trip_id IS NOT NULL THEN
    SELECT * INTO t FROM public.trips WHERE id=p_trip_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
    old_payment:=t.razorpay_payment_id;
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
      (status='cancelled' OR (payment_method='online' AND razorpay_payment_id IS NULL AND placed_at+interval '20 minutes'<=checkout_clock())));
    IF rejected THEN
      PERFORM 1 FROM public.products WHERE id IN(SELECT product_id FROM inventory_reservations WHERE order_id IN(SELECT id FROM public.orders WHERE trip_id=t.id) AND state IN ('held','committed')) ORDER BY id FOR UPDATE;
      UPDATE public.orders SET status='cancelled',cancel_reason='Payment arrived after checkout closed.' WHERE trip_id=t.id AND status IN ('placed','packed');
    END IF;
    UPDATE public.trips SET razorpay_payment_id=p_payment_id,checkout_payment_rejected=rejected,
      status=CASE WHEN rejected THEN 'cancelled' ELSE status END WHERE id=t.id;
    UPDATE public.orders SET razorpay_payment_id=p_payment_id,checkout_payment_rejected=rejected WHERE trip_id=t.id;
    RETURN jsonb_build_object('accepted',NOT rejected,'total',t.total,'settled_now',true);
  ELSE
    SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
    IF NOT FOUND OR o.trip_id IS NOT NULL THEN RAISE EXCEPTION 'Use the trip payment target'; END IF;
    IF o.razorpay_payment_id IS NOT NULL THEN
      IF o.razorpay_payment_id<>p_payment_id THEN RAISE EXCEPTION 'Payment conflict'; END IF;
      RETURN jsonb_build_object('accepted',NOT o.checkout_payment_rejected,'total',o.total,'settled_now',false);
    END IF;
    IF o.payment_method='cod' THEN
      -- Never write razorpay_payment_id onto a COD order: everything
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
    UPDATE public.orders SET razorpay_payment_id=p_payment_id,checkout_payment_rejected=rejected WHERE id=o.id;
    RETURN jsonb_build_object('accepted',NOT rejected,'total',o.total,'settled_now',true);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.abandon_unpaid_checkout(uuid,text,uuid,text,text),public.settle_checkout_payment(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_unpaid_checkout(uuid,text,uuid,text,text),public.settle_checkout_payment(uuid,uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
