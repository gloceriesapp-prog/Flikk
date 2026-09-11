-- Atomic trip + N per-store orders + their order_items — same reasoning as
-- 002_create_order_fn.sql's create_order (Supabase JS has no multi-statement
-- transaction API), just fanning out over p_legs instead of a single store.
-- Called by POST /trips (routes/trips.ts) via supabase.rpc('create_trip_orders', ...).
--
-- Each leg's own order row gets delivery_fee = 0 and total = item_total
-- (no delivery fee attributed to any one store-order) — the trip row
-- carries the one real delivery_fee and the combined total. Payout math
-- (jobs/weeklyPayouts.ts) only ever reads a store-order's own item_total/
-- commission_amount, never total/delivery_fee, so this doesn't change a
-- store owner's payout by a single rupee versus a normal single-store order.

create or replace function create_trip_orders(
  p_customer_id uuid,
  p_address_id uuid,
  p_delivery_fee numeric,
  p_item_total numeric,
  p_total numeric,
  p_legs jsonb -- [{ store_id, item_total, commission_amount, items: [{product_id, quantity, unit_price_at_order}] }, ...]
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
    customer_id, address_id, delivery_fee, item_total, total, status
  ) values (
    p_customer_id, p_address_id, p_delivery_fee, p_item_total, p_total, 'placed'
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

  return v_trip;
end;
$$;
