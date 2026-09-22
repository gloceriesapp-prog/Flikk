-- The handling fee (delivery_settings.handling_fee) is real and already
-- charged to the customer — calcOrderTotal folds it into orders.total /
-- trips.total at checkout (routes/orders.ts, routes/trips.ts) — but was
-- never stored on its own column. That meant it silently disappeared from
-- every money report: Revenue's "Total commission, all-time" only ever
-- summed commission_amount, so this real platform income (charged to the
-- customer, never paid to a store or a rider) was never counted as
-- earnings anywhere admin could see. Same "lock the historical value at
-- creation time" principle every other money column here already follows
-- (order_items.unit_price_at_order, orders.commission_amount) — a later
-- change to delivery_settings.handling_fee must never retroactively
-- change what an old order is reported as having charged.
alter table orders add column handling_fee numeric not null default 0;
alter table trips add column handling_fee numeric not null default 0;

-- Adding a parameter changes the function's signature, so `create or
-- replace` would leave the OLD 11/9-arg overload sitting around unused
-- rather than actually replacing it — drop them explicitly first, same
-- reasoning migrations/025_harden_functions_security.sql's own alter
-- function calls targeted these exact old signatures.
drop function if exists public.create_order(uuid, uuid, uuid, numeric, numeric, numeric, numeric, jsonb, uuid, numeric, text);
drop function if exists public.create_trip_orders(uuid, uuid, numeric, numeric, numeric, jsonb, uuid, numeric, text);

-- create_order/create_trip_orders gain a p_handling_fee param — same
-- "strict superset, default preserves old behavior" approach
-- 034_order_payment_method.sql's own header note already used.
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
    insert into order_items (order_id, product_id, quantity, unit_price_at_order)
    values (
      v_order.id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price_at_order')::numeric
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
      insert into order_items (order_id, product_id, quantity, unit_price_at_order)
      values (
        v_order.id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::int,
        (v_item->>'unit_price_at_order')::numeric
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
