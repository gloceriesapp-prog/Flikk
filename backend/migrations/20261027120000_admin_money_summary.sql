-- admin_money_summary(from, to): the admin Revenue page's money split.
--
-- Every rupee a customer pays lands with Gloceries first (online) or with
-- the rider (cash on delivery), and is then split three ways:
--
--   customer paid = store share + rider pay + Gloceries net
--   store share   = item_total - commission
--   rider pay     = rider_earnings for that delivery
--   Gloceries net = commission + platform fee + (delivery fee - rider pay)
--                   - promo discount (promos are funded by Gloceries; the
--                   store is still paid on the full item_total)
--
-- "earned" covers deliveries completed in [from, to): a single-store order
-- counts when it is delivered, a multi-store trip once, when its last leg
-- is delivered, using the trip-level fees (same rule as
-- admin_revenue_trend, migration 118).
--
-- "stores" and "riders" are balances, not period figures: everything ever
-- owed minus what has been paid, so the money still to send out never
-- hides behind a date filter. A store is owed per delivered order (each
-- trip leg on its own), exactly how compute_store_payouts builds the
-- weekly payout rows (migration 075).
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE OR REPLACE FUNCTION public.admin_money_summary(p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  with units as (
    select o.id as scope_id, o.delivered_at as done_at,
           o.item_total, coalesce(o.commission_amount, 0) as commission,
           coalesce(o.delivery_fee, 0) as delivery_fee, coalesce(o.handling_fee, 0) as platform_fee,
           coalesce(o.discount_amount, 0) as discount, coalesce(o.total, 0) as total
    from orders o
    where o.trip_id is null and o.status = 'delivered' and o.delivered_at is not null
    union all
    select t.id, l.done_at, l.item_total, l.commission,
           coalesce(t.delivery_fee, 0), coalesce(t.handling_fee, 0),
           coalesce(t.discount_amount, 0), coalesce(t.total, 0)
    from (
      select o.trip_id, max(o.delivered_at) as done_at, sum(o.item_total) as item_total,
             sum(coalesce(o.commission_amount, 0)) as commission,
             bool_and(o.status = 'delivered' and o.delivered_at is not null) as all_delivered
      from orders o where o.trip_id is not null group by o.trip_id
    ) l join trips t on t.id = l.trip_id
    where l.all_delivered
  ), rider_pay as (
    select coalesce(e.trip_id, e.order_id) as scope_id, sum(e.amount) as amount
    from rider_earnings e group by 1
  ), period as (
    select u.*, coalesce(r.amount, 0) as rider_pay
    from units u left join rider_pay r on r.scope_id = u.scope_id
    where (p_from is null or u.done_at >= p_from) and (p_to is null or u.done_at < p_to)
  ), earned as (
    select count(*) as deliveries,
           coalesce(sum(total), 0) as customer_paid,
           coalesce(sum(item_total), 0) as item_sales,
           coalesce(sum(commission), 0) as commission,
           coalesce(sum(platform_fee), 0) as platform_fee,
           coalesce(sum(delivery_fee), 0) as delivery_fees,
           coalesce(sum(rider_pay), 0) as rider_pay,
           coalesce(sum(discount), 0) as discounts
    from period
  ), store_owed as (
    select o.store_id, sum(o.item_total - coalesce(o.commission_amount, 0)) as owed,
           sum(o.item_total - coalesce(o.commission_amount, 0)) filter (
             where (p_from is null or o.delivered_at >= p_from) and (p_to is null or o.delivered_at < p_to)) as period_share,
           sum(o.item_total) filter (
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
      'deliveryMargin', round(e.delivery_fees - e.rider_pay, 2),
      'discounts', round(e.discounts, 2),
      'storeShare', round(e.item_sales - e.commission, 2),
      'net', round(e.commission + e.platform_fee + e.delivery_fees - e.rider_pay - e.discounts, 2)
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

COMMIT;
