-- Real distinction between "Cash on Delivery" and "customer intended to
-- pay online" — orders.razorpay_payment_id alone can't tell these apart
-- (both are null for a COD order AND for an online order the customer
-- abandoned mid-payment), which is exactly what makes
-- jobs/expireUnpaidOrders.ts's own stale-order cleanup impossible without
-- this column: it must never touch a legitimate COD order sitting in
-- 'placed' waiting for the store to pack it, only a genuinely abandoned
-- online attempt. Default 'cod' so every existing row (and any future
-- caller that doesn't pass it) keeps its current, correct meaning.
alter table orders
  add column payment_method text not null default 'cod'
    check (payment_method in ('cod', 'online'));

-- create_order/create_trip_orders (023_promo_order_functions.sql) gain a
-- payment_method param — same "strict superset, default preserves old
-- behavior" approach that migration's own header note already used for
-- promo params.
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
  p_payment_method text default 'cod'
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
    promo_code_id, discount_amount, payment_method
  ) values (
    p_customer_id, p_store_id, p_address_id, 'placed',
    p_item_total, p_delivery_fee, p_commission_amount, p_total,
    p_promo_code_id, p_discount_amount, p_payment_method
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
  p_discount_amount numeric default 0,
  p_payment_method text default 'cod'
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
    -- Every leg of a trip shares the same payment_method — the customer
    -- picks one payment method for the whole trip's single combined
    -- payment (CLAUDE.md: one payment, one delivery fee, N real orders),
    -- never a different method per store.
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
