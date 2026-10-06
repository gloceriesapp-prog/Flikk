\set ON_ERROR_STOP on
do $$ begin if current_database()<>'flikk_checkout_tests' then raise exception 'Use isolated flikk_checkout_tests'; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create table zones(id uuid primary key,is_active boolean);
create table stores(id uuid primary key,zone_id uuid,is_active boolean,open_time text,close_time text,lat double precision,lng double precision,delivery_radius_km double precision);
create table addresses(id uuid primary key,user_id uuid,zone_id uuid,latitude double precision,longitude double precision,deleted_at timestamptz);
create type test_stock_status as enum ('in_stock','low_stock','out_of_stock');
create table products(id uuid primary key,store_id uuid,price numeric,original_price numeric,unit text,is_in_stock boolean,
 stock_status test_stock_status default 'in_stock',stock_quantity integer default 0,approval_status text default 'approved');
create table product_variants(id uuid primary key,product_id uuid references products,unit_type text,quantity numeric,price numeric,original_price numeric,is_default boolean);
create table trips(id uuid primary key default gen_random_uuid(),customer_id uuid,address_id uuid,delivery_fee numeric,item_total numeric,total numeric,status text,
 promo_code_id uuid,discount_amount numeric,handling_fee numeric,razorpay_payment_id text);
create table orders(id uuid primary key default gen_random_uuid(),customer_id uuid,store_id uuid,address_id uuid,status text,item_total numeric,delivery_fee numeric,
 commission_amount numeric,total numeric,promo_code_id uuid,discount_amount numeric,payment_method text,handling_fee numeric default 0,
 trip_id uuid references trips,razorpay_payment_id text,placed_at timestamptz default now(),picked_up_at timestamptz,cancel_reason text,
 refund_status text default 'none',razorpay_refund_id text,refunded_at timestamptz);
create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid references orders,product_id uuid references products,quantity integer check(quantity>0),unit_price_at_order numeric);
create table promo_codes(id uuid primary key,times_used integer);
create table promo_redemptions(promo_code_id uuid,customer_id uuid,order_id uuid,trip_id uuid,discount_amount numeric);
\ir ../../migrations/062_order_product_variants.sql
\ir ../../migrations/063_checkout_eligibility_inventory.sql
do $$ begin
 if has_function_privilege('authenticated','settle_checkout_payment(uuid,uuid,text)','execute')
   or has_function_privilege('anon','expire_checkout_reservations()','execute')
   or has_function_privilege('authenticated','create_order(uuid,uuid,uuid,numeric,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric)','execute')
   or has_table_privilege('authenticated','inventory_reservations','select') then raise exception 'API role can bypass backend checkout'; end if;
end $$;
-- Fixed time only in this isolated database, 12:00 IST.
create or replace function checkout_clock() returns timestamptz language sql volatile as $$ select '2026-10-04 06:30:00+00'::timestamptz $$;
insert into zones values ('00000000-0000-4000-8000-000000000001',true);
insert into stores values
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001',true,'6:00 AM','10:00 PM',13.27,74.75,12),
 ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001',true,'06:00','22:00',13.27,74.75,12);
insert into addresses values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001',13.271,74.751,null);
insert into products(id,store_id,price,original_price,unit,is_in_stock,stock_status,stock_quantity,approval_status,stock_tracking_enabled) values
 ('00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000010',10,15,'1 pc',true,'in_stock',3,'approved',true),
 ('00000000-0000-4000-8000-000000000200','00000000-0000-4000-8000-000000000020',10,15,'1 pc',true,'in_stock',3,'approved',true);
create function test_order(qty integer,method text default 'cod') returns orders language sql as $$
 select create_order('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000010',
 '00000000-0000-4000-8000-000000000002',10*qty,20,1,10*qty+20,
 jsonb_build_array(jsonb_build_object('product_id','00000000-0000-4000-8000-000000000100','quantity',qty,'unit_price_at_order',10)),null,0,method,0)
$$;
do $$ declare o orders; remaining integer; payment jsonb; count_before integer; begin
 o:=test_order(2);
 if (select stock_quantity from products where id='00000000-0000-4000-8000-000000000100')<>1 then raise exception 'Reservation did not subtract stock'; end if;
 select count(*) into count_before from orders;
 begin perform test_order(2); raise exception 'Overselling accepted'; exception when sqlstate 'P1002' then null; end;
 if (select count(*) from orders)<>count_before then raise exception 'Failed checkout left an order'; end if;
 update orders set status='cancelled' where id=o.id;
 update orders set status='cancelled' where id=o.id;
 if (select stock_quantity from products where id='00000000-0000-4000-8000-000000000100')<>3 then raise exception 'Release missing or doubled'; end if;
 begin update orders set status='placed' where id=o.id; raise exception 'Cancelled order resurrected'; exception when sqlstate 'P1001' then null; end;
 -- Paid orders commit their existing hold once; pickup consumes it.
 o:=test_order(1,'online');
 payment:=settle_checkout_payment(o.id,null,'payment-on-time');
 if not(payment->>'accepted')::boolean then raise exception 'On-time payment rejected'; end if;
 perform settle_checkout_payment(o.id,null,'payment-on-time');
 if (select stock_quantity from products where id='00000000-0000-4000-8000-000000000100')<>2 then raise exception 'Payment reserved stock twice'; end if;
 update orders set status='packed' where id=o.id;
 update orders set status='out_for_delivery',picked_up_at=checkout_clock() where id=o.id;
 update orders set status='failed' where id=o.id;
 if exists(select 1 from inventory_reservations where order_id=o.id and state<>'consumed') then raise exception 'Pickup did not consume stock'; end if;
 -- Unpaid expiry releases stock and blocks a late capture from resurrection.
 o:=test_order(1,'online');
 update orders set placed_at=checkout_clock()-interval '21 minutes' where id=o.id;
 perform expire_checkout_reservations();
 if (select status from orders where id=o.id)<>'cancelled' then raise exception 'Timeout did not cancel'; end if;
 payment:=settle_checkout_payment(o.id,null,'late-payment');
 if (payment->>'accepted')::boolean then raise exception 'Late payment accepted'; end if;
 if (select stock_quantity from products where id='00000000-0000-4000-8000-000000000100')<>2 then raise exception 'Late capture took stock again'; end if;
 -- Final transactional gates (not just request-time checks).
 update stores set is_active=false where id='00000000-0000-4000-8000-000000000010';
 begin perform test_order(1); raise exception 'Closed shop accepted'; exception when sqlstate 'P1001' then null; end;
 update stores set is_active=true,lat=0,lng=0 where id='00000000-0000-4000-8000-000000000010';
 begin perform test_order(1); raise exception 'Out-of-range order accepted'; exception when sqlstate 'P1001' then null; end;
 update stores set lat=13.27,lng=74.75 where id='00000000-0000-4000-8000-000000000010';
 update products set approval_status='pending' where id='00000000-0000-4000-8000-000000000100';
 begin perform test_order(1); raise exception 'Unapproved product accepted'; exception when raise_exception then if sqlerrm<>'Product unavailable' then raise; end if; end;
 update products set approval_status='approved' where id='00000000-0000-4000-8000-000000000100';
 update addresses set latitude=null where id='00000000-0000-4000-8000-000000000002';
 begin perform test_order(1); raise exception 'Unpinned address accepted'; exception when sqlstate 'P1001' then null; end;
 update addresses set latitude=13.271 where id='00000000-0000-4000-8000-000000000002';
end $$;
-- A failing second shop rolls back the whole trip and the first reservation.
do $$ declare before_a integer; before_b integer; before_orders integer; trip trips; begin
 select stock_quantity into before_a from products where id='00000000-0000-4000-8000-000000000100';
 select stock_quantity into before_b from products where id='00000000-0000-4000-8000-000000000200';
 select count(*) into before_orders from orders;
 begin
 perform create_trip_orders('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',35,60,95,
 '[{"store_id":"00000000-0000-4000-8000-000000000010","item_total":10,"commission_amount":1,"items":[{"product_id":"00000000-0000-4000-8000-000000000100","quantity":1,"unit_price_at_order":10}]},
 {"store_id":"00000000-0000-4000-8000-000000000020","item_total":50,"commission_amount":5,"items":[{"product_id":"00000000-0000-4000-8000-000000000200","quantity":5,"unit_price_at_order":10}]}]'::jsonb,null,0,'online',0);
 raise exception 'Oversold trip accepted'; exception when sqlstate 'P1002' then null; end;
 if (select count(*) from orders)<>before_orders or (select stock_quantity from products where id='00000000-0000-4000-8000-000000000100')<>before_a
   or (select stock_quantity from products where id='00000000-0000-4000-8000-000000000200')<>before_b then raise exception 'Trip rollback failed'; end if;
end $$;

-- More final-gate coverage: schedules, ownership, deletion and zone activity.
do $$ begin
 update stores set close_time='11:00 AM' where id='00000000-0000-4000-8000-000000000010';
 begin perform test_order(1); raise exception 'Scheduled closed shop accepted'; exception when sqlstate 'P1001' then null; end;
 update stores set close_time='10:00 PM' where id='00000000-0000-4000-8000-000000000010';
 update addresses set user_id='00000000-0000-4000-8000-000000000004' where id='00000000-0000-4000-8000-000000000002';
 begin perform test_order(1); raise exception 'Foreign address accepted'; exception when sqlstate 'P1001' then null; end;
 update addresses set user_id='00000000-0000-4000-8000-000000000003',deleted_at=now() where id='00000000-0000-4000-8000-000000000002';
 begin perform test_order(1); raise exception 'Deleted address accepted'; exception when sqlstate 'P1001' then null; end;
 update addresses set deleted_at=null where id='00000000-0000-4000-8000-000000000002';
 update zones set is_active=false;
 begin perform test_order(1); raise exception 'Inactive zone accepted'; exception when sqlstate 'P1001' then null; end;
 update zones set is_active=true;
end $$;
create or replace function checkout_clock() returns timestamptz language sql volatile as $$ select '2026-10-04 17:00:00+00'::timestamptz $$;
do $$ begin
 begin perform test_order(1); raise exception 'Platform closing boundary accepted'; exception when sqlstate 'P1001' then null; end;
end $$;
create or replace function checkout_clock() returns timestamptz language sql volatile as $$ select '2026-10-04 06:30:00+00'::timestamptz $$;
select 'Checkout eligibility, inventory conservation, timeout and late-payment checks passed' as result;
