-- Atomic order + order_items creation. Called by POST /orders (routes/orders.ts)
-- via supabase.rpc('create_order', ...). Keeps the two inserts in one transaction
-- without a multi-statement client API. Source: specs/00-foundation/api-conventions.md.

create or replace function create_order(
  p_customer_id uuid,
  p_store_id uuid,
  p_address_id uuid,
  p_item_total numeric,
  p_delivery_fee numeric,
  p_commission_amount numeric,
  p_total numeric,
  p_items jsonb
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
    item_total, delivery_fee, commission_amount, total
  ) values (
    p_customer_id, p_store_id, p_address_id, 'placed',
    p_item_total, p_delivery_fee, p_commission_amount, p_total
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

  return v_order;
end;
$$;
