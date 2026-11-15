-- Rider pay per km, and customer tips that go to the rider in full.
--
-- 1. delivery_settings.rider_per_km_payout (admin Settings). When above 0 the
--    rider earns rider_base_payout + rider_per_km_payout x road km for an order
--    or trip, plus the extra-shop payout as before. Road km = estimated road
--    distance (delivery_road_km, migration 104) from the farthest shop in the
--    order or trip to the customer's pin, rounded to 0.1 km. 0 (the default)
--    keeps today's rule (20261027090000) unchanged.
-- 2. orders.tip_amount / trips.tip_amount: the tip the customer chose at
--    checkout (0-500 rupees). It is already inside total, so online payment,
--    refunds and cash on delivery (cod_cash_due) include it with no change.
--    create_checkout_attempt stores it from p_args.p_tip_amount.
-- 3. rider_earnings.tip_amount / road_km. record_atomic_rider_earning pays the
--    tip in full on a delivered order or trip (not on a failed one) on top of
--    the delivery pay: amount = pay + tip. Weekly payouts already sum amount.
-- 4. rider_pay_preview(orders): what each order or trip will pay before it is
--    delivered (road km, pay split, tip); the backend shows it to riders.
-- 5. admin_money_summary: riderPay excludes tips (they pass straight through
--    to the rider, so they are not a delivery cost); riderTips reports them.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS rider_per_km_payout numeric(10,2) NOT NULL DEFAULT 0
    CHECK (rider_per_km_payout >= 0 AND rider_per_km_payout <= 100);
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tip_amount numeric(10,2) NOT NULL DEFAULT 0
    CHECK (tip_amount >= 0 AND tip_amount <= 500);
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS tip_amount numeric(10,2) NOT NULL DEFAULT 0
    CHECK (tip_amount >= 0 AND tip_amount <= 500);
ALTER TABLE public.rider_earnings
  ADD COLUMN IF NOT EXISTS tip_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tip_amount >= 0),
  ADD COLUMN IF NOT EXISTS road_km numeric(6,1);
REVOKE INSERT(tip_amount), UPDATE(tip_amount) ON public.orders FROM anon, authenticated;
REVOKE INSERT(tip_amount), UPDATE(tip_amount) ON public.trips FROM anon, authenticated;

-- Road km from the farthest live shop of this order's order/trip to the
-- customer's pin. NULL when a pin is missing.
CREATE OR REPLACE FUNCTION public.delivery_scope_road_km(p_order uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  SELECT round(max(delivery_road_km(s.lat, s.lng, a.latitude, a.longitude))::numeric, 1)
  FROM orders o0
  JOIN orders o ON o.id = o0.id OR (o0.trip_id IS NOT NULL AND o.trip_id = o0.trip_id)
  JOIN stores s ON s.id = o.store_id
  JOIN addresses a ON a.id = o.address_id
  WHERE o0.id = p_order AND o.status <> 'cancelled'
    AND s.lat IS NOT NULL AND s.lng IS NOT NULL AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.delivery_scope_road_km(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delivery_scope_road_km(uuid) TO service_role;

-- The one rider pay rule (tip excluded). Mirrored for tests only in
-- backend/src/lib/earningsBreakdown.ts.
CREATE OR REPLACE FUNCTION public.rider_delivery_pay(p_delivery_fee numeric, p_extra_stops integer, p_road_km numeric)
 RETURNS TABLE(amount numeric, base_amount numeric, extra_stop_amount numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  WITH d AS (SELECT * FROM delivery_settings LIMIT 1), s AS (
    SELECT coalesce((SELECT rider_base_payout FROM d), 0) AS base_payout,
           coalesce((SELECT rider_extra_stop_payout FROM d), 0) AS stop_payout,
           coalesce((SELECT extra_stop_fee FROM d), 15) AS stop_fee,
           coalesce((SELECT rider_per_km_payout FROM d), 0) AS per_km,
           greatest(coalesce(p_delivery_fee, 0), 0) AS fee,
           greatest(coalesce(p_extra_stops, 0), 0) AS stops,
           greatest(coalesce(p_road_km, 0), 0) AS km
  ), p AS (
    SELECT round(CASE WHEN per_km > 0 THEN base_payout + per_km * km
                      WHEN base_payout > 0 THEN base_payout
                      ELSE fee - least(fee, stop_fee * stops) END, 2) AS base_part,
           round(CASE WHEN (per_km > 0 OR base_payout > 0) AND stop_payout > 0 THEN stop_payout * stops
                      ELSE least(fee, stop_fee * stops) END, 2) AS extra_part
    FROM s
  )
  SELECT base_part + extra_part, base_part, extra_part FROM p;
$$;
REVOKE ALL ON FUNCTION public.rider_delivery_pay(numeric, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rider_delivery_pay(numeric, integer, numeric) TO service_role;

-- Kept for any caller of the old two-argument rule (no distance known).
CREATE OR REPLACE FUNCTION public.rider_delivery_payout(p_delivery_fee numeric, p_extra_stops integer)
 RETURNS TABLE(amount numeric, base_amount numeric, extra_stop_amount numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  SELECT * FROM rider_delivery_pay(p_delivery_fee, p_extra_stops, NULL);
$$;

-- 108 + road km and tip.
CREATE OR REPLACE FUNCTION public.record_atomic_rider_earning()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE fee numeric; stops integer; km numeric; tip numeric; pay record;
BEGIN
 IF NEW.status NOT IN('delivered','failed') OR OLD.status=NEW.status THEN RETURN NEW; END IF;
 IF NEW.rider_id IS NULL THEN RAISE EXCEPTION 'Completion requires assigned rider'; END IF;
 km := delivery_scope_road_km(NEW.id);
 IF NEW.trip_id IS NULL THEN
  SELECT * INTO pay FROM rider_delivery_pay(NEW.delivery_fee,0,km);
  tip := CASE WHEN NEW.status='delivered' THEN coalesce(NEW.tip_amount,0) ELSE 0 END;
  INSERT INTO rider_earnings(rider_id,order_id,amount,base_amount,extra_stop_amount,tip_amount,road_km)
   VALUES(NEW.rider_id,NEW.id,pay.amount+tip,pay.base_amount,pay.extra_stop_amount,tip,km) ON CONFLICT DO NOTHING;
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.trip_id::text,790));
  IF NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status NOT IN('delivered','failed','cancelled')) THEN
   IF EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status<>'cancelled' AND rider_id IS DISTINCT FROM NEW.rider_id) THEN
    RAISE EXCEPTION 'Trip has inconsistent rider assignments'; END IF;
   SELECT delivery_fee,
          CASE WHEN EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status='delivered') THEN coalesce(tip_amount,0) ELSE 0 END
     INTO STRICT fee, tip FROM trips WHERE id=NEW.trip_id;
   SELECT greatest(count(DISTINCT store_id)-1,0) INTO stops FROM orders WHERE trip_id=NEW.trip_id AND status<>'cancelled';
   SELECT * INTO pay FROM rider_delivery_pay(fee,stops,km);
   INSERT INTO rider_earnings(rider_id,order_id,trip_id,amount,base_amount,extra_stop_amount,tip_amount,road_km)
    VALUES(NEW.rider_id,NEW.id,NEW.trip_id,pay.amount+tip,pay.base_amount,pay.extra_stop_amount,tip,km) ON CONFLICT DO NOTHING;
  END IF;
 END IF;
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.record_atomic_rider_earning() FROM PUBLIC,anon,authenticated;

-- Pay preview per order (whole order or trip, same figure on every leg).
CREATE OR REPLACE FUNCTION public.rider_pay_preview(p_orders uuid[])
 RETURNS TABLE(order_id uuid, road_km numeric, tip_amount numeric, amount numeric, base_amount numeric, extra_stop_amount numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
  SELECT o.id, x.km, x.tip, p.amount, p.base_amount, p.extra_stop_amount
  FROM orders o
  LEFT JOIN trips t ON t.id = o.trip_id
  CROSS JOIN LATERAL (SELECT delivery_scope_road_km(o.id) AS km,
    coalesce(CASE WHEN o.trip_id IS NULL THEN o.tip_amount ELSE t.tip_amount END, 0) AS tip,
    CASE WHEN o.trip_id IS NULL THEN o.delivery_fee ELSE t.delivery_fee END AS fee,
    CASE WHEN o.trip_id IS NULL THEN 0 ELSE (SELECT greatest(count(DISTINCT l.store_id)-1,0)::integer
      FROM orders l WHERE l.trip_id = o.trip_id AND l.status <> 'cancelled') END AS stops) x
  CROSS JOIN LATERAL rider_delivery_pay(x.fee, x.stops, x.km) p
  WHERE o.id = ANY(p_orders) AND cardinality(p_orders) <= 200;
$$;
REVOKE ALL ON FUNCTION public.rider_pay_preview(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rider_pay_preview(uuid[]) TO service_role;

-- 20261106090000 + the tip.
CREATE OR REPLACE FUNCTION public.create_checkout_attempt(p_customer_id uuid, p_attempt_id uuid, p_fingerprint text, p_kind text, p_args jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a checkout_attempts; v_result jsonb; v_from timestamptz := (p_args->>'p_deliver_from')::timestamptz; v_tip numeric := coalesce((p_args->>'p_tip_amount')::numeric,0);
begin
  insert into checkout_attempts(customer_id,attempt_id,fingerprint,kind)
    values(p_customer_id,p_attempt_id,p_fingerprint,p_kind) on conflict do nothing;
  select * into a from checkout_attempts where customer_id=p_customer_id and attempt_id=p_attempt_id for update;
  if a.fingerprint<>p_fingerprint or a.kind<>p_kind then raise exception 'Attempt conflict' using errcode='P0409'; end if;
  if a.abandoned then raise exception 'Attempt closed' using errcode='P0410'; end if;
  if a.result is not null then return jsonb_build_object('result',a.result,'replayed',true); end if;
  if p_kind='order' then
    select to_jsonb(o) into v_result from create_order(p_customer_id,(p_args->>'p_store_id')::uuid,
      (p_args->>'p_address_id')::uuid,(p_args->>'p_item_total')::numeric,(p_args->>'p_delivery_fee')::numeric,
      (p_args->>'p_commission_amount')::numeric,(p_args->>'p_total')::numeric,p_args->'p_items',
      (p_args->>'p_promo_code_id')::uuid,(p_args->>'p_discount_amount')::numeric,p_args->>'p_payment_method',
      (p_args->>'p_handling_fee')::numeric) o;
    -- Pre-order products only with a slot, and a slot only for them.
    if exists(select 1 from order_items i join products p on p.id=i.product_id
              where i.order_id=(v_result->>'id')::uuid and p.preorder_enabled is distinct from (v_from is not null)) then
      raise exception using errcode='40001', message='Pre-order items need their own checkout';
    end if;
    if v_from is not null then
      -- Same pre-order window stamp_store_visible_at gives an online order once paid.
      update orders set deliver_from=v_from, deliver_until=(p_args->>'p_deliver_until')::timestamptz,
        acceptance_deadline_at=case when store_visible_at is not null then least(store_visible_at+interval '3 hours',v_from) end
        where id=(v_result->>'id')::uuid;
      select to_jsonb(o) into v_result from orders o where o.id=(v_result->>'id')::uuid;
    end if;
  elsif p_kind='trip' then
    if v_from is not null then raise exception using errcode='40001', message='Pre-orders come from one shop'; end if;
    select to_jsonb(t) into v_result from create_trip_orders(p_customer_id,(p_args->>'p_address_id')::uuid,
      (p_args->>'p_delivery_fee')::numeric,(p_args->>'p_item_total')::numeric,(p_args->>'p_total')::numeric,
      p_args->'p_legs',(p_args->>'p_promo_code_id')::uuid,(p_args->>'p_discount_amount')::numeric,
      p_args->>'p_payment_method',(p_args->>'p_handling_fee')::numeric) t;
    if exists(select 1 from orders o join order_items i on i.order_id=o.id join products p on p.id=i.product_id
              where o.trip_id=(v_result->>'id')::uuid and p.preorder_enabled) then
      raise exception using errcode='40001', message='Pre-order items need their own checkout';
    end if;
  else raise exception 'Invalid checkout kind'; end if;
  -- Rider tip (whole order or trip): already inside p_total; stored here so
  -- record_atomic_rider_earning can pay it to the rider in full.
  if v_tip<>0 then
    if p_kind='order' then
      update orders set tip_amount=v_tip where id=(v_result->>'id')::uuid;
      select to_jsonb(o) into v_result from orders o where o.id=(v_result->>'id')::uuid;
    else
      update trips set tip_amount=v_tip where id=(v_result->>'id')::uuid;
      select to_jsonb(t) into v_result from trips t where t.id=(v_result->>'id')::uuid;
    end if;
  end if;
  update checkout_attempts set result=v_result where customer_id=p_customer_id and attempt_id=p_attempt_id;
  return jsonb_build_object('result',v_result,'replayed',false);
end $function$;
REVOKE ALL ON FUNCTION public.create_checkout_attempt(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_attempt(uuid, uuid, text, text, jsonb) TO service_role;

-- 20261104160000 + tips kept out of rider pay.
CREATE OR REPLACE FUNCTION public.admin_money_summary(p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  with units as (
    select o.id as scope_id, o.delivered_at as done_at,
           o.item_total, coalesce(o.store_item_total, o.item_total) as store_items, coalesce(o.commission_amount, 0) as commission,
           coalesce(o.delivery_fee, 0) as delivery_fee, coalesce(o.handling_fee, 0) as platform_fee,
           coalesce(o.discount_amount, 0) as discount, coalesce(o.total, 0) as total
    from orders o
    where o.trip_id is null and o.status = 'delivered' and o.delivered_at is not null
    union all
    select t.id, l.done_at, l.item_total, l.store_items, l.commission,
           coalesce(t.delivery_fee, 0), coalesce(t.handling_fee, 0),
           coalesce(t.discount_amount, 0), coalesce(t.total, 0)
    from (
      select o.trip_id, max(o.delivered_at) as done_at, sum(o.item_total) as item_total,
             sum(coalesce(o.store_item_total, o.item_total)) as store_items,
             sum(coalesce(o.commission_amount, 0)) as commission,
             bool_and(o.status = 'delivered' and o.delivered_at is not null) as all_delivered
      from orders o where o.trip_id is not null group by o.trip_id
    ) l join trips t on t.id = l.trip_id
    where l.all_delivered
  ), rider_pay as (
    select coalesce(e.trip_id, e.order_id) as scope_id, sum(e.amount - e.tip_amount) as amount, sum(e.tip_amount) as tips
    from rider_earnings e group by 1
  ), period as (
    select u.*, coalesce(r.amount, 0) as rider_pay, coalesce(r.tips, 0) as tips
    from units u left join rider_pay r on r.scope_id = u.scope_id
    where (p_from is null or u.done_at >= p_from) and (p_to is null or u.done_at < p_to)
  ), earned as (
    select count(*) as deliveries,
           coalesce(sum(total), 0) as customer_paid,
           coalesce(sum(item_total), 0) as item_sales,
           coalesce(sum(store_items), 0) as store_items,
           coalesce(sum(commission), 0) as commission,
           coalesce(sum(platform_fee), 0) as platform_fee,
           coalesce(sum(delivery_fee), 0) as delivery_fees,
           coalesce(sum(rider_pay), 0) as rider_pay,
           coalesce(sum(tips), 0) as tips,
           coalesce(sum(discount), 0) as discounts
    from period
  ), store_owed as (
    select o.store_id, sum(coalesce(o.store_item_total, o.item_total) - coalesce(o.commission_amount, 0)) as owed,
           sum(coalesce(o.store_item_total, o.item_total) - coalesce(o.commission_amount, 0)) filter (
             where (p_from is null or o.delivered_at >= p_from) and (p_to is null or o.delivered_at < p_to)) as period_share,
           sum(coalesce(o.store_item_total, o.item_total)) filter (
             where (p_from is null or o.delivered_at >= p_from) and (p_to is null or o.delivered_at < p_to)) as period_sales,
           sum(coalesce(o.commission_amount, 0)) filter (
             where (p_from is null or o.delivered_at >= p_from) and (p_to is null or o.delivered_at < p_to)) as period_commission
    from orders o where o.status = 'delivered' and o.delivered_at is not null
    group by o.store_id
  ), store_paid as (
    select p.store_id,
           sum(p.net_payout) filter (where p.status = 'paid') as paid,
           sum(p.net_payout) filter (where p.status <> 'paid') as in_payouts,
           sum(p.net_payout) as batched
    from payouts p group by p.store_id
  ), store_rows as (
    select s.id as store_id, s.name,
           round(coalesce(o.period_sales, 0), 2) as period_sales,
           round(coalesce(o.period_commission, 0), 2) as period_commission,
           round(coalesce(o.period_share, 0), 2) as period_share,
           round(coalesce(o.owed, 0), 2) as owed_total,
           round(coalesce(p.paid, 0), 2) as paid,
           round(coalesce(p.in_payouts, 0), 2) as in_payouts,
           round(greatest(coalesce(o.owed, 0) - coalesce(p.batched, 0), 0), 2) as not_batched,
           round(coalesce(o.owed, 0) - coalesce(p.paid, 0), 2) as outstanding
    from stores s
    left join store_owed o on o.store_id = s.id
    left join store_paid p on p.store_id = s.id
    where o.store_id is not null or p.store_id is not null
  ), riders as (
    select coalesce(sum(amount), 0) as owed_total,
           coalesce(sum(amount) filter (where paid_at is not null), 0) as paid,
           coalesce(sum(amount) filter (where paid_at is null), 0) as outstanding
    from rider_earnings
  ), cash as (
    select coalesce(sum(amount) filter (where settled_at is null), 0) as with_riders,
           count(*) filter (where settled_at is null) as collections
    from rider_cash_collections
  )
  select jsonb_build_object(
    'earned', (select jsonb_build_object(
      'deliveries', e.deliveries,
      'customerPaid', round(e.customer_paid, 2),
      'itemSales', round(e.item_sales, 2),
      'commission', round(e.commission, 2),
      'platformFee', round(e.platform_fee, 2),
      'deliveryFees', round(e.delivery_fees, 2),
      'riderPay', round(e.rider_pay, 2),
      'riderTips', round(e.tips, 2),
      'deliveryMargin', round(e.delivery_fees - e.rider_pay, 2),
      'discounts', round(e.discounts, 2),
      'markup', round(e.item_sales - e.store_items, 2),
      'storeShare', round(e.store_items - e.commission, 2),
      'net', round(e.item_sales - e.store_items + e.commission + e.platform_fee + e.delivery_fees - e.rider_pay - e.discounts, 2)
    ) from earned e),
    'stores', jsonb_build_object(
      'owedTotal', (select coalesce(sum(owed_total), 0) from store_rows),
      'paid', (select coalesce(sum(paid), 0) from store_rows),
      'inPayouts', (select coalesce(sum(in_payouts), 0) from store_rows),
      'notBatched', (select coalesce(sum(not_batched), 0) from store_rows),
      'outstanding', (select coalesce(sum(outstanding), 0) from store_rows),
      'rows', (select coalesce(jsonb_agg(jsonb_build_object(
          'storeId', store_id, 'name', name, 'periodSales', period_sales,
          'periodCommission', period_commission, 'periodShare', period_share,
          'owedTotal', owed_total, 'paid', paid, 'inPayouts', in_payouts,
          'notBatched', not_batched, 'outstanding', outstanding)
        order by outstanding desc, period_sales desc, name), '[]'::jsonb) from store_rows)
    ),
    'riders', (select jsonb_build_object('owedTotal', round(owed_total, 2), 'paid', round(paid, 2),
      'outstanding', round(outstanding, 2)) from riders),
    'cash', (select jsonb_build_object('withRiders', round(with_riders, 2), 'collections', collections) from cash)
  );
$$;
REVOKE ALL ON FUNCTION public.admin_money_summary(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_money_summary(timestamptz, timestamptz) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
