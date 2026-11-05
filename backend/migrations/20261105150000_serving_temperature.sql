-- Serving temperature (2026-11-05): soft drinks and the like can be sold
-- chilled, at room temperature, or both. Admin ticks the options on the
-- product; with both the customer picks one, with one it is just applied.
-- Price is the same either way.
--
-- 1. products.serving_options: subset of {chilled, room_temperature},
--    no repeats. Empty = not a drink, no choice.
-- 2. order_items.serving: what the customer gets, kept on the line.
-- 3. snapshot_order_item_variant checks/fills it; create_order and
--    create_trip_orders pass each item's serving through.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS serving_options text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_serving_options_check;
ALTER TABLE public.products ADD CONSTRAINT products_serving_options_check CHECK (
  serving_options <@ ARRAY['chilled','room_temperature']::text[]
  AND (cardinality(serving_options) < 2 OR serving_options[1] <> serving_options[2])
);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS serving text;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_serving_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_serving_check CHECK (serving IS NULL OR serving IN ('chilled','room_temperature'));

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
  opt public.product_options;
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
  -- Flavour: required when the product has any, must be its own and in stock.
  if new.option_id is not null then
    select * into opt from public.product_options where id = new.option_id and product_id = new.product_id;
    if not found or not opt.is_available then
      raise exception using errcode = '40001', message = 'Flavour unavailable';
    end if;
    new.option_name_at_order := opt.name;
  elsif exists(select 1 from public.product_options where product_id = new.product_id) then
    raise exception using errcode = '40001', message = 'Choose a flavour';
  end if;
  -- Serving: one offered = applied; two offered = customer must pick one.
  if coalesce(cardinality(product.serving_options), 0) = 0 then
    if new.serving is not null then
      raise exception using errcode = '40001', message = 'Serving option unavailable';
    end if;
  elsif new.serving is null and cardinality(product.serving_options) = 1 then
    new.serving := product.serving_options[1];
  elsif new.serving is null then
    raise exception using errcode = '40001', message = 'Choose chilled or room temperature';
  elsif not (new.serving = any(product.serving_options)) then
    raise exception using errcode = '40001', message = 'Serving option unavailable';
  end if;
  new.unit_price_at_order := price;
  new.store_unit_price_at_order := store_price;
  new.unit_at_order := pack;
  new.variant_mrp_at_order := mrp;
  return new;
end $$;
REVOKE ALL ON FUNCTION public.snapshot_order_item_variant() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_order(p_customer_id uuid, p_store_id uuid, p_address_id uuid, p_item_total numeric, p_delivery_fee numeric, p_commission_amount numeric, p_total numeric, p_items jsonb, p_promo_code_id uuid DEFAULT NULL::uuid, p_discount_amount numeric DEFAULT 0, p_payment_method text DEFAULT 'cod'::text, p_handling_fee numeric DEFAULT 0)
 RETURNS orders
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_order orders;
  v_item jsonb;
begin
  perform 1 from public.products where id in(select (value->>'product_id')::uuid from jsonb_array_elements(p_items)) order by id for update;
  insert into orders (
    customer_id, store_id, address_id, status,
    item_total, delivery_fee, commission_amount, total,
    promo_code_id, discount_amount, payment_method, handling_fee, is_bulk
  ) values (
    p_customer_id, p_store_id, p_address_id, 'placed',
    p_item_total, p_delivery_fee, p_commission_amount, p_total,
    p_promo_code_id, p_discount_amount, p_payment_method, p_handling_fee,
    exists(select 1 from jsonb_array_elements(p_items) e where e.value->'bulk' = 'true'::jsonb)
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order, cut_size, option_id, serving)
    values (
      v_order.id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price_at_order')::numeric,
      (v_item->>'variant_id')::uuid,
      v_item->>'unit_at_order',
      (v_item->>'variant_mrp_at_order')::numeric,
      v_item->>'cut_size',
      (v_item->>'option_id')::uuid,
      v_item->>'serving'
    );
  end loop;

  if p_promo_code_id is not null then
    insert into promo_redemptions (promo_code_id, customer_id, order_id, discount_amount)
    values (p_promo_code_id, p_customer_id, v_order.id, p_discount_amount);
    update promo_codes set times_used = times_used + 1 where id = p_promo_code_id;
  end if;

  return v_order;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_trip_orders(p_customer_id uuid, p_address_id uuid, p_delivery_fee numeric, p_item_total numeric, p_total numeric, p_legs jsonb, p_promo_code_id uuid DEFAULT NULL::uuid, p_discount_amount numeric DEFAULT 0, p_payment_method text DEFAULT 'cod'::text, p_handling_fee numeric DEFAULT 0)
 RETURNS trips
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_trip trips;
  v_leg jsonb;
  v_order orders;
  v_item jsonb;
begin
  perform 1 from public.products where id in(
    select (item->>'product_id')::uuid from jsonb_array_elements(p_legs) leg,
      lateral jsonb_array_elements(leg->'items') item) order by id for update;
  insert into trips (
    customer_id, address_id, delivery_fee, item_total, total, status,
    promo_code_id, discount_amount, handling_fee
  ) values (
    p_customer_id, p_address_id, p_delivery_fee, p_item_total, p_total, 'placed',
    p_promo_code_id, p_discount_amount, p_handling_fee
  )
  returning * into v_trip;

  for v_leg in select * from jsonb_array_elements(p_legs)
  loop
    insert into orders (
      customer_id, store_id, address_id, status, trip_id,
      item_total, delivery_fee, commission_amount, total, payment_method, is_bulk
    ) values (
      p_customer_id,
      (v_leg->>'store_id')::uuid,
      p_address_id,
      'placed',
      v_trip.id,
      (v_leg->>'item_total')::numeric,
      0,
      (v_leg->>'commission_amount')::numeric,
      (v_leg->>'item_total')::numeric,
      p_payment_method,
      exists(select 1 from jsonb_array_elements(v_leg->'items') e where e.value->'bulk' = 'true'::jsonb)
    )
    returning * into v_order;

    for v_item in select * from jsonb_array_elements(v_leg->'items')
    loop
      insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order, cut_size, option_id, serving)
      values (
        v_order.id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::int,
        (v_item->>'unit_price_at_order')::numeric,
        (v_item->>'variant_id')::uuid,
        v_item->>'unit_at_order',
        (v_item->>'variant_mrp_at_order')::numeric,
        v_item->>'cut_size',
        (v_item->>'option_id')::uuid,
        v_item->>'serving'
      );
    end loop;
  end loop;

  if p_promo_code_id is not null then
    insert into promo_redemptions (promo_code_id, customer_id, trip_id, discount_amount)
    values (p_promo_code_id, p_customer_id, v_trip.id, p_discount_amount);
    update promo_codes set times_used = times_used + 1 where id = p_promo_code_id;
  end if;

  return v_trip;
end;
$function$;

COMMIT;
NOTIFY pgrst, 'reload schema';
