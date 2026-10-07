-- Requires 063, 064, 076, 080, 083. Prepared migration: deploy before this API release.
-- 1. Provider reconciliation gate before unpaid-checkout expiry.
-- 2. settle_checkout_payment reports whether THIS call recorded the payment
--    (partner "new order" push fires exactly once, on settlement).
-- 3. Promotion discount in integer paise, the same half-up rule as lib/promos.ts.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- expiry_checked_at: a provider read AFTER the deadline found nothing to
-- settle. expiry_lease_until fences concurrent/crashed reconcilers.
ALTER TABLE public.checkout_payment_sessions
 ADD COLUMN IF NOT EXISTS expiry_checked_at timestamptz,
 ADD COLUMN IF NOT EXISTS expiry_lease_until timestamptz NOT NULL DEFAULT '-infinity';

-- Driven from the existing unpaid-expiry indexes (076), so sessions of paid
-- orders never grow the scan. Leases survive worker restarts: a crashed
-- reconciler's rows become claimable again after two minutes.
CREATE OR REPLACE FUNCTION public.claim_checkout_expiry_reconciliation(p_limit integer DEFAULT 25)
RETURNS TABLE(kind text,target_id uuid,provider_order_id text,total numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cutoff timestamptz:=checkout_clock()-interval '20 minutes'; singles uuid[]; trip_ids uuid[];
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Batch limit must be 1–100'; END IF;
 SELECT coalesce(array_agg(q.target_id),'{}') INTO singles FROM (
  SELECT s.target_id FROM orders o JOIN checkout_payment_sessions s ON s.kind='order' AND s.target_id=o.id
  WHERE o.trip_id IS NULL AND o.status='placed' AND o.payment_method='online' AND o.razorpay_payment_id IS NULL
   AND o.placed_at<=cutoff AND s.provider_order_id IS NOT NULL AND s.expiry_checked_at IS NULL AND s.expiry_lease_until<now()
  ORDER BY o.placed_at,o.id LIMIT p_limit FOR UPDATE OF s SKIP LOCKED
 ) q;
 SELECT coalesce(array_agg(q.target_id),'{}') INTO trip_ids FROM (
  SELECT s.target_id FROM trips tr JOIN checkout_payment_sessions s ON s.kind='trip' AND s.target_id=tr.id
  WHERE tr.status='placed' AND tr.razorpay_payment_id IS NULL
   AND EXISTS(SELECT 1 FROM orders c WHERE c.trip_id=tr.id AND c.payment_method='online' AND c.placed_at<=cutoff)
   AND s.provider_order_id IS NOT NULL AND s.expiry_checked_at IS NULL AND s.expiry_lease_until<now()
  ORDER BY tr.created_at,tr.id LIMIT p_limit FOR UPDATE OF s SKIP LOCKED
 ) q;
 UPDATE checkout_payment_sessions s SET expiry_lease_until=now()+interval '2 minutes'
 WHERE (s.kind='order' AND s.target_id=ANY(singles)) OR (s.kind='trip' AND s.target_id=ANY(trip_ids));
 RETURN QUERY SELECT s.kind,s.target_id,s.provider_order_id,coalesce(o.total,tr.total)
 FROM checkout_payment_sessions s
 LEFT JOIN orders o ON s.kind='order' AND o.id=s.target_id
 LEFT JOIN trips tr ON s.kind='trip' AND tr.id=s.target_id
 WHERE (s.kind='order' AND s.target_id=ANY(singles)) OR (s.kind='trip' AND s.target_id=ANY(trip_ids));
END $$;

CREATE OR REPLACE FUNCTION public.mark_checkout_expiry_checked(p_kind text,p_target_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 UPDATE checkout_payment_sessions SET expiry_checked_at=now() WHERE kind=p_kind AND target_id=p_target_id;
$$;

-- 076's batch, plus: a checkout with a provider order is only expired after
-- reconciliation marked it checked, or 30 minutes past the deadline (bounded
-- inventory hold if Razorpay is unreachable/unconfigured). Anything captured
-- after expiry is still settled-then-refunded by settle_checkout_payment.
CREATE OR REPLACE FUNCTION public.expire_checkout_reservation_batch(p_limit integer DEFAULT 100) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.trips; o public.orders; rows jsonb:='[]'; affected jsonb;
 singles integer:=0; trip_count integer:=0; target_trips uuid[]; target_singles uuid[];
 cutoff timestamptz:=checkout_clock()-interval '20 minutes';
 hard_cutoff timestamptz:=cutoff-interval '30 minutes';
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Batch limit must be 1–100'; END IF;
 PERFORM set_config('lock_timeout','1000ms',true);
 SELECT coalesce(array_agg(q.id),'{}') INTO target_trips FROM (
  SELECT tr.id FROM public.trips tr WHERE tr.status='placed' AND tr.razorpay_payment_id IS NULL
   AND EXISTS(SELECT 1 FROM public.orders child WHERE child.trip_id=tr.id AND child.payment_method='online' AND child.placed_at<=cutoff)
   AND (tr.created_at<=hard_cutoff OR NOT EXISTS(SELECT 1 FROM public.checkout_payment_sessions s WHERE s.kind='trip' AND s.target_id=tr.id
    AND s.provider_order_id IS NOT NULL AND s.expiry_checked_at IS NULL))
  ORDER BY tr.created_at,tr.id LIMIT p_limit FOR UPDATE SKIP LOCKED
 ) q;
 SELECT coalesce(array_agg(q.id),'{}') INTO target_singles FROM (
  SELECT ord.id FROM public.orders ord WHERE ord.trip_id IS NULL AND ord.status='placed'
   AND ord.payment_method='online' AND ord.razorpay_payment_id IS NULL AND ord.placed_at<=cutoff
   AND (ord.placed_at<=hard_cutoff OR NOT EXISTS(SELECT 1 FROM public.checkout_payment_sessions s WHERE s.kind='order' AND s.target_id=ord.id
    AND s.provider_order_id IS NOT NULL AND s.expiry_checked_at IS NULL))
  ORDER BY ord.placed_at,ord.id LIMIT p_limit FOR UPDATE SKIP LOCKED
 ) q;
 PERFORM 1 FROM public.orders WHERE trip_id=ANY(target_trips) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.products WHERE id IN (
  SELECT product_id FROM public.inventory_reservations r WHERE r.state='held'
   AND (r.order_id=ANY(target_singles) OR r.order_id IN(SELECT id FROM public.orders WHERE trip_id=ANY(target_trips)))
 ) ORDER BY id FOR UPDATE;
 FOR t IN SELECT * FROM public.trips WHERE id=ANY(target_trips) ORDER BY id LOOP
  trip_count:=trip_count+1;
  WITH cancelled AS (
   UPDATE public.orders SET status='cancelled',cancel_reason='Payment was not completed in time.'
   WHERE trip_id=t.id AND status='placed' AND razorpay_payment_id IS NULL RETURNING id,customer_id
  ) SELECT coalesce(jsonb_agg(to_jsonb(cancelled)),'[]') INTO affected FROM cancelled;
  rows:=rows||affected;
  UPDATE public.trips SET status='cancelled' WHERE id=t.id;
 END LOOP;
 FOR o IN SELECT * FROM public.orders WHERE id=ANY(target_singles) ORDER BY id LOOP
  singles:=singles+1;
  UPDATE public.orders SET status='cancelled',cancel_reason='Payment was not completed in time.' WHERE id=o.id;
  rows:=rows||jsonb_build_array(jsonb_build_object('id',o.id,'customer_id',o.customer_id));
 END LOOP;
 RETURN jsonb_build_object('cancelled_orders',jsonb_array_length(rows),'single_targets',singles,'trip_targets',trip_count,'cancelled',rows);
END $$;

-- 063's settlement, unchanged except settled_now: false on an idempotent
-- repeat (webhook + SDK verify both settle the same payment).
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
    rejected:=o.status='cancelled' OR (o.payment_method='online' AND o.placed_at+interval '20 minutes'<=checkout_clock());
    IF rejected AND o.status IN ('placed','packed') THEN
      UPDATE public.orders SET status='cancelled',cancel_reason='Payment arrived after checkout closed.' WHERE id=o.id;
    END IF;
    -- 080's BEFORE UPDATE trigger queues the refund when rejected.
    UPDATE public.orders SET razorpay_payment_id=p_payment_id,checkout_payment_rejected=rejected WHERE id=o.id;
    RETURN jsonb_build_object('accepted',NOT rejected,'total',o.total,'settled_now',true);
  END IF;
END $$;

-- Integer paise, half-up: percent = floor((items_paise * percent_hundredths
-- + 5000) / 10000). Mirrors lib/promos.ts calcDiscount exactly.
CREATE OR REPLACE FUNCTION public.guard_promo_redemption() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p promo_codes; items numeric; payer uuid; items_p bigint; expected_p bigint;
BEGIN
 SELECT * INTO p FROM promo_codes WHERE id=NEW.promo_code_id FOR UPDATE;
 IF NOT FOUND OR NOT p.is_active OR (p.expires_at IS NOT NULL AND p.expires_at<=clock_timestamp()) THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion is unavailable or expired'; END IF;
 IF p.usage_limit IS NOT NULL AND p.times_used>=p.usage_limit THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion usage limit reached'; END IF;
 IF NEW.trip_id IS NOT NULL THEN SELECT item_total,customer_id INTO items,payer FROM trips WHERE id=NEW.trip_id;
 ELSE SELECT item_total,customer_id INTO items,payer FROM orders WHERE id=NEW.order_id; END IF;
 IF payer IS DISTINCT FROM NEW.customer_id OR items IS NULL OR items<p.min_order_value THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion does not qualify for this order'; END IF;
 items_p:=round(items*100)::bigint;
 expected_p:=CASE WHEN p.discount_type='flat' THEN round(p.discount_value*100)::bigint
  ELSE (items_p*round(p.discount_value*100)::bigint+5000)/10000 END;
 IF p.max_discount_amount IS NOT NULL THEN expected_p:=least(expected_p,round(p.max_discount_amount*100)::bigint); END IF;
 expected_p:=greatest(least(expected_p,items_p),0);
 IF NEW.discount_amount IS DISTINCT FROM expected_p::numeric/100 THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion price changed; refresh checkout'; END IF;
 RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.claim_checkout_expiry_reconciliation(integer),public.mark_checkout_expiry_checked(text,uuid),
 public.expire_checkout_reservation_batch(integer),public.settle_checkout_payment(uuid,uuid,text),public.guard_promo_redemption()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout_expiry_reconciliation(integer),public.mark_checkout_expiry_checked(text,uuid),
 public.expire_checkout_reservation_batch(integer),public.settle_checkout_payment(uuid,uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
