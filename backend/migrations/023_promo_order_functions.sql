-- create_order/create_trip_orders (002_create_order_fn.sql,
-- 015_create_trip_orders_fn.sql) gain promo-aware params. p_promo_code_id
-- is null for the overwhelmingly common no-code checkout — the redemption
-- insert only fires when it's actually set, keeping this a strict
-- superset of the old behavior rather than a second code path.

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
  p_discount_amount numeric default 0
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
    promo_code_id, discount_amount
  ) values (
    p_customer_id, p_store_id, p_address_id, 'placed',
    p_item_total, p_delivery_fee, p_commission_amount, p_total,
    p_promo_code_id, p_discount_amount
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

create or replace function create_trip_orders(
  p_customer_id uuid,
  p_address_id uuid,
  p_delivery_fee numeric,
  p_item_total numeric,
  p_total numeric,
  p_legs jsonb,
  p_promo_code_id uuid default null,
  p_discount_amount numeric default 0
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
    promo_code_id, discount_amount
  ) values (
    p_customer_id, p_address_id, p_delivery_fee, p_item_total, p_total, 'placed',
    p_promo_code_id, p_discount_amount
  )
  returning * into v_trip;

  for v_leg in select * from jsonb_array_elements(p_legs)
  loop
    insert into orders (
      customer_id, store_id, address_id, status, trip_id,
      item_total, delivery_fee, commission_amount, total
    ) values (
      p_customer_id,
      (v_leg->>'store_id')::uuid,
      p_address_id,
      'placed',
      v_trip.id,
      (v_leg->>'item_total')::numeric,
      0,
      (v_leg->>'commission_amount')::numeric,
      (v_leg->>'item_total')::numeric
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
