-- Product flavours (2026-11-05): one product (Bingo Mad Angles) sold in
-- several flavours, each with its own photo and name, at the product's own
-- sizes and prices. Admin adds them on the product form.
--
-- 1. product_options: id, product_id, name, image_url, sort_order,
--    is_available. Public read (customer feeds embed them); writes are
--    service-role only (admin API).
-- 2. order_items.option_id (ON DELETE SET NULL) + option_name_at_order:
--    the flavour picked for the line, its name kept even if the option is
--    later renamed or deleted.
-- 3. snapshot_order_item_variant also checks the flavour: a product with
--    flavours needs one, it must belong to the product and be in stock;
--    the name is copied onto the line. Prices are unchanged by flavour.
-- 4. create_order / create_trip_orders insert option_id from each item.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE IF NOT EXISTS public.product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  image_url text CHECK (image_url IS NULL OR image_url ~* '^https?://'),
  sort_order integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, name)
);
CREATE INDEX IF NOT EXISTS product_options_product_idx ON public.product_options(product_id, sort_order);
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_options_public_read ON public.product_options;
CREATE POLICY product_options_public_read ON public.product_options FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.product_options FROM anon, authenticated;
GRANT SELECT ON public.product_options TO anon, authenticated;
GRANT ALL ON public.product_options TO service_role;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES public.product_options(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS option_name_at_order text;

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
    insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order, cut_size, option_id)
    values (
      v_order.id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price_at_order')::numeric,
      (v_item->>'variant_id')::uuid,
      v_item->>'unit_at_order',
      (v_item->>'variant_mrp_at_order')::numeric,
      v_item->>'cut_size',
      (v_item->>'option_id')::uuid
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
      insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order, cut_size, option_id)
      values (
        v_order.id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::int,
        (v_item->>'unit_price_at_order')::numeric,
        (v_item->>'variant_id')::uuid,
        v_item->>'unit_at_order',
        (v_item->>'variant_mrp_at_order')::numeric,
        v_item->>'cut_size',
        (v_item->>'option_id')::uuid
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
