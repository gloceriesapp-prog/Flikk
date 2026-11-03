-- Chicken cut sizes and bulk orders (2026-11-04).
--
-- 1. products.cut_options_enabled: admin's per-product "Chicken cut & bulk"
--    toggle. Only such products accept a cut size (small/medium/large pieces;
--    same price, a preparation instruction for the store).
-- 2. products.bulk_min_kg: from this many kg of the product in one order the
--    order is a bulk order. NULL = no bulk handling. Needs the toggle.
-- 3. order_items.cut_size: the chosen cut, per line. The same pack in two cut
--    sizes is two lines (no unique index on order_items stops that).
-- 4. orders.is_bulk: set at creation when any line is flagged bulk by the
--    backend (checkoutItems.ts). The store still accepts or rejects it like
--    every order, but gets delivery_settings.bulk_response_timeout_minutes
--    (default 30) instead of the normal response window before the order is
--    auto-cancelled (cancel_unanswered_store_orders reads the stamped deadline).
-- create_order/create_trip_orders/stamp_store_visible_at are the live
-- definitions with only these additions.
BEGIN;
SET LOCAL lock_timeout='5s';

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cut_options_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bulk_min_kg numeric(6,2);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_bulk_min_kg_check;
ALTER TABLE public.products ADD CONSTRAINT products_bulk_min_kg_check
  CHECK (bulk_min_kg IS NULL OR (cut_options_enabled AND bulk_min_kg > 0 AND bulk_min_kg <= 500));

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS cut_size text;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_cut_size_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_cut_size_check
  CHECK (cut_size IS NULL OR cut_size IN ('small','medium','large'));

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_bulk boolean NOT NULL DEFAULT false;

ALTER TABLE public.delivery_settings ADD COLUMN IF NOT EXISTS bulk_response_timeout_minutes integer NOT NULL DEFAULT 30;
ALTER TABLE public.delivery_settings DROP CONSTRAINT IF EXISTS delivery_settings_bulk_response_timeout_check;
ALTER TABLE public.delivery_settings ADD CONSTRAINT delivery_settings_bulk_response_timeout_check
  CHECK (bulk_response_timeout_minutes BETWEEN 5 AND 240);

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
    insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order, cut_size)
    values (
      v_order.id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price_at_order')::numeric,
      (v_item->>'variant_id')::uuid,
      v_item->>'unit_at_order',
      (v_item->>'variant_mrp_at_order')::numeric,
      v_item->>'cut_size'
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
      insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order, cut_size)
      values (
        v_order.id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::int,
        (v_item->>'unit_price_at_order')::numeric,
        (v_item->>'variant_id')::uuid,
        v_item->>'unit_at_order',
        (v_item->>'variant_mrp_at_order')::numeric,
        v_item->>'cut_size'
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

CREATE OR REPLACE FUNCTION public.stamp_store_visible_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE response_minutes integer; preparation_minutes integer;
BEGIN
 IF NEW.status='placed' AND (NEW.payment_method='cod' OR NEW.provider_payment_id IS NOT NULL)
    AND NOT coalesce(NEW.checkout_payment_rejected,false) THEN
  NEW.store_visible_at:=coalesce(NEW.store_visible_at,now());
  IF NEW.acceptance_deadline_at IS NULL THEN
   -- Bulk orders give the store longer to check it can supply them.
   SELECT CASE WHEN NEW.is_bulk THEN bulk_response_timeout_minutes ELSE store_response_timeout_minutes END
     INTO response_minutes FROM public.delivery_settings LIMIT 1;
   NEW.acceptance_deadline_at:=NEW.store_visible_at+make_interval(mins=>coalesce(response_minutes,CASE WHEN NEW.is_bulk THEN 30 ELSE 10 END));
  END IF;
 END IF;
 -- Older clients can still mark packed directly. Enforce the same payment and
 -- response deadline and atomically record their acceptance before dispatch.
 IF TG_OP='UPDATE' AND OLD.status='placed' AND NEW.status='packed' AND OLD.accepted_at IS NULL THEN
  IF NEW.store_visible_at IS NULL OR coalesce(NEW.checkout_payment_rejected,false)
     OR (NEW.payment_method<>'cod' AND NEW.provider_payment_id IS NULL) THEN
   RAISE EXCEPTION USING errcode='P0409',message='PAYMENT_PENDING';
  END IF;
  IF NEW.acceptance_deadline_at<=now() THEN
   RAISE EXCEPTION USING errcode='P0409',message='ACCEPTANCE_EXPIRED';
  END IF;
  NEW.accepted_at:=now();
  SELECT avg_prep_minutes INTO preparation_minutes FROM public.stores WHERE id=NEW.store_id;
  NEW.preparation_deadline_at:=CASE WHEN preparation_minutes IS NOT NULL THEN NEW.accepted_at+make_interval(mins=>greatest(0,preparation_minutes)) END;
 END IF;
 RETURN NEW;
END $function$;

COMMIT;
NOTIFY pgrst, 'reload schema';
