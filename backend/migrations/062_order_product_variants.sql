-- Variant-aware checkout. Historical items retain null pack snapshots.
-- Does not require or apply migration 060; variant MRP is a separate snapshot.
begin;
alter table public.order_items
  add column variant_id uuid references public.product_variants(id) on delete set null,
  add column unit_at_order text,
  add column variant_mrp_at_order numeric;
create index order_items_variant_id_idx on public.order_items (variant_id) where variant_id is not null;
alter table public.order_items add constraint order_items_variant_mrp_valid
  check (variant_mrp_at_order is null or variant_mrp_at_order >= unit_price_at_order);

-- Recheck prices and availability inside the same transaction as order creation.
-- Share locks prevent catalogue edits between this check and transaction commit.
create function public.snapshot_order_item_variant() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  product public.products;
  variant public.product_variants;
  price numeric;
  mrp numeric;
  pack text;
  seller uuid;
begin
  select * into product from public.products where id = new.product_id for share;
  if not found or not product.is_in_stock then
    raise exception 'Product unavailable';
  end if;
  select store_id into seller from public.orders where id = new.order_id;
  if seller is distinct from product.store_id then raise exception 'Product does not belong to the order store'; end if;
  if new.variant_id is not null then
    select * into variant from public.product_variants
      where id = new.variant_id and product_id = new.product_id for share;
    if not found then raise exception 'Variant unavailable'; end if;
    price := variant.price;
    mrp := greatest(price, coalesce(variant.original_price, price));
    pack := trim_scale(variant.quantity::numeric)::text || ' ' || case when variant.unit_type = 'l' then 'L' else variant.unit_type::text end;
  else
    -- Preserve the base-product contract for products without packs and old clients.
    price := product.price;
    mrp := greatest(price, coalesce(product.original_price, price));
    pack := coalesce(product.unit, '');
  end if;
  if new.unit_price_at_order is distinct from price
     or (new.unit_at_order is not null and new.unit_at_order is distinct from pack) then
    raise exception using errcode = '40001', message = 'Pack changed during checkout';
  end if;
  new.unit_price_at_order := price;
  new.unit_at_order := pack;
  new.variant_mrp_at_order := mrp;
  return new;
end $$;
revoke all on function public.snapshot_order_item_variant() from public;
create trigger order_items_snapshot_variant before insert on public.order_items
for each row execute function public.snapshot_order_item_variant();

create or replace function create_order(
  p_customer_id uuid,
  p_store_id uuid,
  p_address_id uuid,
  p_item_total numeric,
  p_delivery_fee numeric,
  p_commission_amount numeric,
  p_total numeric,
  p_items jsonb,
  p_promo_code_id uuid default null,
  p_discount_amount numeric default 0,
  p_payment_method text default 'cod',
  p_handling_fee numeric default 0
)
returns orders
language plpgsql
as $$
declare
  v_order orders;
  v_item jsonb;
begin
  insert into orders (
    customer_id, store_id, address_id, status,
    item_total, delivery_fee, commission_amount, total,
    promo_code_id, discount_amount, payment_method, handling_fee
  ) values (
    p_customer_id, p_store_id, p_address_id, 'placed',
    p_item_total, p_delivery_fee, p_commission_amount, p_total,
    p_promo_code_id, p_discount_amount, p_payment_method, p_handling_fee
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order)
    values (
      v_order.id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price_at_order')::numeric,
      (v_item->>'variant_id')::uuid,
      v_item->>'unit_at_order',
      (v_item->>'variant_mrp_at_order')::numeric
    );
  end loop;

  if p_promo_code_id is not null then
    insert into promo_redemptions (promo_code_id, customer_id, order_id, discount_amount)
    values (p_promo_code_id, p_customer_id, v_order.id, p_discount_amount);
    update promo_codes set times_used = times_used + 1 where id = p_promo_code_id;
  end if;

  return v_order;
end;
$$;

-- Trip legs' own order rows keep handling_fee at its column default (0) —
-- the fee is charged once per checkout at the trip level (same reasoning
-- delivery_fee already follows: the trip's own row carries the real fee,
-- each leg's order row carries 0 so a per-leg sum never double-counts it).
create or replace function create_trip_orders(
  p_customer_id uuid,
  p_address_id uuid,
  p_delivery_fee numeric,
  p_item_total numeric,
  p_total numeric,
  p_legs jsonb,
  p_promo_code_id uuid default null,
  p_discount_amount numeric default 0,
  p_payment_method text default 'cod',
  p_handling_fee numeric default 0
)
returns trips
language plpgsql
as $$
declare
  v_trip trips;
  v_leg jsonb;
  v_order orders;
  v_item jsonb;
begin
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
      item_total, delivery_fee, commission_amount, total, payment_method
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
      p_payment_method
    )
    returning * into v_order;

    for v_item in select * from jsonb_array_elements(v_leg->'items')
    loop
      insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order)
      values (
        v_order.id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::int,
        (v_item->>'unit_price_at_order')::numeric,
        (v_item->>'variant_id')::uuid,
        v_item->>'unit_at_order',
        (v_item->>'variant_mrp_at_order')::numeric
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
$$;

-- Re-apply the same search_path hardening 025_harden_functions_security.sql
-- put on the old signatures — a fresh `create or replace` doesn't carry
-- that setting forward on its own.
alter function public.create_order(
  uuid, uuid, uuid, numeric, numeric, numeric, numeric, jsonb, uuid, numeric, text, numeric
) set search_path = public;

alter function public.create_trip_orders(
  uuid, uuid, numeric, numeric, numeric, jsonb, uuid, numeric, text, numeric
) set search_path = public;

commit;
