-- Capture MRP at checkout so later catalogue edits cannot change an old
-- bill's product discount. Legacy rows stay null: today's MRP is not a
-- reliable historical price. The trigger covers both atomic checkout
-- functions without changing their RPC signatures.
begin;

alter table public.order_items
  add column unit_mrp_at_order numeric(10,2);

alter table public.order_items
  add constraint order_items_mrp_not_below_price
  check (unit_mrp_at_order is null or unit_mrp_at_order >= unit_price_at_order);

create function public.snapshot_order_item_mrp()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_mrp numeric;
begin
  select original_price into v_mrp
  from public.products
  where id = new.product_id;

  -- No marked-down MRP means the checkout price itself is the list price.
  new.unit_mrp_at_order := greatest(new.unit_price_at_order, coalesce(v_mrp, new.unit_price_at_order));
  return new;
end;
$$;

create trigger order_items_snapshot_mrp
before insert on public.order_items
for each row execute function public.snapshot_order_item_mrp();

commit;
