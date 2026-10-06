-- Run only against an empty local database named flikk_variant_tests.
\set ON_ERROR_STOP on
do $$ begin
  if current_database() <> 'flikk_variant_tests' then raise exception 'Use an isolated test database'; end if;
end $$;
create table products (id uuid primary key, store_id uuid, price numeric, original_price numeric, unit text, is_in_stock boolean);
create table product_variants (id uuid primary key, product_id uuid references products, unit_type text, quantity numeric(12,3), price numeric, original_price numeric, is_default boolean);
create table trips (id uuid primary key default gen_random_uuid(), customer_id uuid, address_id uuid, delivery_fee numeric,
  item_total numeric, total numeric, status text, promo_code_id uuid, discount_amount numeric, handling_fee numeric);
create table orders (id uuid primary key default gen_random_uuid(), customer_id uuid, store_id uuid, address_id uuid,
  status text, item_total numeric, delivery_fee numeric, commission_amount numeric, total numeric, promo_code_id uuid,
  discount_amount numeric, payment_method text, handling_fee numeric default 0, trip_id uuid references trips);
create table order_items (id uuid primary key default gen_random_uuid(), order_id uuid references orders,
  product_id uuid references products, quantity integer check(quantity > 0), unit_price_at_order numeric);
create table promo_codes (id uuid primary key, times_used integer);
create table promo_redemptions (promo_code_id uuid, customer_id uuid, order_id uuid, trip_id uuid, discount_amount numeric);
\ir ../../migrations/062_order_product_variants.sql

insert into products values
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010',10,15,'250 g',true),
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000020',5,null,'1 pc',true);
insert into product_variants values
 ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','g',250,10,15,true),
 ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','kg',1,32,40,false);

do $$
declare
  created orders;
  trip trips;
  count_before integer;
  packs jsonb := '[{"product_id":"00000000-0000-4000-8000-000000000001","variant_id":"00000000-0000-4000-8000-000000000003","quantity":1,"unit_price_at_order":10,"unit_at_order":"250 g"},
  {"product_id":"00000000-0000-4000-8000-000000000001","variant_id":"00000000-0000-4000-8000-000000000004","quantity":2,"unit_price_at_order":32,"unit_at_order":"1 kg","variant_mrp_at_order":999}]';
begin
  created := create_order(null,'00000000-0000-4000-8000-000000000010',null,74,20,7.4,99,packs);
  if (select count(*) from order_items where order_id=created.id) <> 2 then raise exception 'Mixed packs collapsed'; end if;
  if not exists (select 1 from order_items where order_id=created.id and variant_id='00000000-0000-4000-8000-000000000004'
    and unit_at_order='1 kg' and unit_price_at_order=32 and variant_mrp_at_order=40) then raise exception 'Snapshot incorrect'; end if;
  trip := create_trip_orders(null,null,35,79,119,jsonb_build_array(
    jsonb_build_object('store_id','00000000-0000-4000-8000-000000000010','item_total',74,'commission_amount',7.4,'items',packs),
    jsonb_build_object('store_id','00000000-0000-4000-8000-000000000020','item_total',5,'commission_amount',0.5,'items',
      '[{"product_id":"00000000-0000-4000-8000-000000000002","quantity":1,"unit_price_at_order":5}]'::jsonb)));
  if (select count(*) from orders where trip_id=trip.id) <> 2 then raise exception 'Trip stores not split'; end if;
  if (select count(*) from order_items join orders on orders.id=order_items.order_id where trip_id=trip.id) <> 3 then raise exception 'Trip packs lost'; end if;
  update product_variants set price=33, quantity=2 where id='00000000-0000-4000-8000-000000000004';
  if not exists(select 1 from order_items where order_id=created.id and unit_price_at_order=32 and unit_at_order='1 kg') then raise exception 'History changed'; end if;
  select count(*) into count_before from orders;
  begin
    perform create_order(null,'00000000-0000-4000-8000-000000000010',null,74,20,7.4,99,packs);
    raise exception 'Stale pack accepted';
  exception when serialization_failure then null;
  end;
  if (select count(*) from orders) <> count_before then raise exception 'Failed checkout left an order behind'; end if;
  update products set is_in_stock=false where id='00000000-0000-4000-8000-000000000001';
  begin
    perform create_order(null,'00000000-0000-4000-8000-000000000010',null,74,20,7.4,99,packs);
    raise exception 'Unavailable product accepted';
  exception when raise_exception then
    if sqlerrm <> 'Product unavailable' then raise; end if;
  end;
  delete from product_variants where id='00000000-0000-4000-8000-000000000004';
  if not exists(select 1 from order_items where order_id=created.id and variant_id is null and unit_at_order='1 kg' and unit_price_at_order=32) then raise exception 'Deleted pack lost history'; end if;
end $$;
select 'Variant checkout transaction checks passed' as result;
