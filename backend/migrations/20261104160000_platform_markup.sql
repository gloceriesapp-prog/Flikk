-- Gloceries' own extra on top of the store price (2026-11-04).
--
-- product_variants.price stays the STORE price: what the store sets in the
-- partner app and what it is paid. product_variants.platform_markup is a
-- fixed rupee amount per pack, set only in admin. The customer pays
--   customer price = store price + markup, never above MRP
-- (customer_unit_price; a store price already above MRP is charged as is,
-- with no markup). Commission is charged on the store price only.
--
-- 1. product_variants.platform_markup (rupees, >= 0, default 0).
-- 2. order_items.store_unit_price_at_order and orders.store_item_total:
--    what the store is paid for the line/order. NULL on orders placed before
--    this migration, which read as the customer price (no markup then).
--    unit_price_at_order / item_total keep meaning what the customer paid.
-- 3. snapshot_order_item_variant (the BEFORE INSERT authority on line
--    prices, 063) now checks the line against the customer price and
--    records the store price; an AFTER INSERT trigger adds each line's store
--    amount to orders.store_item_total.
-- 4. compute_store_payouts and admin_money_summary pay stores on the store
--    total; admin_money_summary reports the markup and adds it to net.
-- 5. products.waive_commission: admin switch to charge the store no
--    commission at all on a product (usually one carrying our extra).
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS platform_markup numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_platform_markup_check;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_platform_markup_check CHECK (platform_markup >= 0 AND platform_markup <= 100000);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS store_unit_price_at_order numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_item_total numeric(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS waive_commission boolean NOT NULL DEFAULT false;

-- Same rule as backend/src/lib/customerPrice.ts customerUnitPrice().
CREATE OR REPLACE FUNCTION public.customer_unit_price(p_store_price numeric, p_markup numeric, p_mrp numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
  SELECT CASE WHEN p_mrp IS NULL OR p_mrp <= 0 THEN p_store_price + coalesce(p_markup, 0)
              ELSE greatest(p_store_price, least(p_store_price + coalesce(p_markup, 0), p_mrp)) END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_order_item_variant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
declare
  product public.products;
  variant public.product_variants;
  store_price numeric;
  price numeric;
  mrp numeric;
  pack text;
  seller uuid;
begin
  select * into product from public.products where id = new.product_id for update;
  if not found or not product.is_in_stock or product.stock_status='out_of_stock' or product.approval_status is distinct from 'approved' then
    raise exception 'Product unavailable';
  end if;
  select store_id into seller from public.orders where id = new.order_id;
  if seller is distinct from product.store_id then raise exception 'Product does not belong to the order store'; end if;
  if new.variant_id is not null then
    select * into variant from public.product_variants
      where id = new.variant_id and product_id = new.product_id for share;
    if not found then raise exception 'Variant unavailable'; end if;
    store_price := variant.price;
    price := public.customer_unit_price(variant.price, variant.platform_markup, variant.original_price);
    mrp := greatest(price, coalesce(variant.original_price, price));
    pack := trim_scale(variant.quantity::numeric)::text || ' ' || case when variant.unit_type = 'l' then 'L' else variant.unit_type::text end;
  else
    -- Products without packs carry no markup.
    store_price := product.price;
    price := product.price;
    mrp := greatest(price, coalesce(product.original_price, price));
    pack := coalesce(product.unit, '');
  end if;
  if new.unit_price_at_order is distinct from price
     or (new.unit_at_order is not null and new.unit_at_order is distinct from pack) then
    raise exception using errcode = '40001', message = 'Pack changed during checkout';
  end if;
  new.unit_price_at_order := price;
  new.store_unit_price_at_order := store_price;
  new.unit_at_order := pack;
  new.variant_mrp_at_order := mrp;
  return new;
end $$;
REVOKE ALL ON FUNCTION public.snapshot_order_item_variant() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_order_item_store_total() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
begin
  update public.orders
     set store_item_total = round(coalesce(store_item_total, 0) + coalesce(new.store_unit_price_at_order, new.unit_price_at_order) * new.quantity, 2)
   where id = new.order_id;
  return null;
end $$;
REVOKE ALL ON FUNCTION public.add_order_item_store_total() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS order_items_store_total ON public.order_items;
CREATE TRIGGER order_items_store_total AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.add_order_item_store_total();

CREATE OR REPLACE FUNCTION public.compute_store_payouts(p_start timestamptz,p_end timestamptz,p_start_date date,p_end_date date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF p_end<=p_start OR p_end-p_start<>interval '7 days'
 OR p_start_date<>(p_start AT TIME ZONE 'Asia/Kolkata')::date OR p_end_date<>(p_end AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Invalid settlement week'; END IF;
 INSERT INTO public.payouts(store_id,week_start,week_end,gross_amount,commission_deducted,net_payout,status)
 SELECT store_id,p_start_date,p_end_date,sum(coalesce(store_item_total,item_total)),sum(commission_amount),
        round(sum(coalesce(store_item_total,item_total))-sum(commission_amount),2),'pending'
 FROM public.orders WHERE status='delivered' AND delivered_at>=p_start AND delivered_at<p_end GROUP BY store_id
 ON CONFLICT(store_id,week_start) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;

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
           coalesce(sum(store_items), 0) as store_items,
           coalesce(sum(commission), 0) as commission,
           coalesce(sum(platform_fee), 0) as platform_fee,
           coalesce(sum(delivery_fee), 0) as delivery_fees,
           coalesce(sum(rider_pay), 0) as rider_pay,
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

COMMIT;
NOTIFY pgrst, 'reload schema';
