\set ON_ERROR_STOP on
do $$ begin if current_database()<>'flikk_checkout_tests' then raise exception 'Use isolated flikk_checkout_tests'; end if; end $$;
create table if not exists users(id uuid primary key);
insert into users values('00000000-0000-4000-8000-000000000003') on conflict do nothing;
alter table trips add column if not exists created_at timestamptz default now();
\ir ../../migrations/064_checkout_attempts_payment_recovery.sql
update products set stock_quantity=100,is_in_stock=true,stock_status='in_stock';
create or replace function test_attempt(attempt uuid, fingerprint text default 'same',method text default 'cod') returns jsonb language sql as $$
 select create_checkout_attempt('00000000-0000-4000-8000-000000000003',attempt,fingerprint,'order',
 jsonb_build_object('p_store_id','00000000-0000-4000-8000-000000000010','p_address_id','00000000-0000-4000-8000-000000000002',
 'p_item_total',10,'p_delivery_fee',20,'p_commission_amount',1,'p_total',30,'p_discount_amount',0,'p_handling_fee',0,
 'p_payment_method',method,'p_items',jsonb_build_array(jsonb_build_object('product_id','00000000-0000-4000-8000-000000000100',
 'quantity',1,'unit_price_at_order',10,'unit_at_order','1 pc','variant_mrp_at_order',15))))
$$;
do $$ declare first jsonb; again jsonb; before_stock integer; s jsonb; begin
 select stock_quantity into before_stock from products where id='00000000-0000-4000-8000-000000000100';
 first:=test_attempt('00000000-0000-4000-8000-000000000901');
 again:=test_attempt('00000000-0000-4000-8000-000000000901');
 if first->'result'<>again->'result' or (first->>'replayed')::boolean or not(again->>'replayed')::boolean then raise exception 'Replay changed order'; end if;
 if (select stock_quantity from products where id='00000000-0000-4000-8000-000000000100')<>before_stock-1 then raise exception 'Replay reserved stock twice'; end if;
 begin perform test_attempt('00000000-0000-4000-8000-000000000901','changed'); raise exception 'Conflict allowed'; exception when sqlstate 'P0409' then null; end;
 s:=close_checkout_attempt('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000902','same','order');
 begin perform test_attempt('00000000-0000-4000-8000-000000000902'); raise exception 'Closed attempt created order'; exception when sqlstate 'P0410' then null; end;
 s:=close_checkout_attempt('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000901','same','order');
 if s->'result'<>first->'result' then raise exception 'Close lost committed order'; end if;
 begin perform claim_checkout_payment('00000000-0000-4000-8000-000000000003','order',(first->'result'->>'id')::uuid,'order'); raise exception 'COD accepted online payment'; exception when sqlstate 'P0410' then null; end;
 first:=test_attempt('00000000-0000-4000-8000-000000000903','same','online');
 s:=claim_checkout_payment('00000000-0000-4000-8000-000000000003','order',(first->'result'->>'id')::uuid,'order');
 if not(s->>'claimed')::boolean then raise exception 'First provider claim failed'; end if;
 s:=claim_checkout_payment('00000000-0000-4000-8000-000000000003','order',(first->'result'->>'id')::uuid,'order');
 if (s->>'claimed')::boolean then raise exception 'Second provider claim allowed duplicate'; end if;
 update checkout_payment_sessions set provider_order_id='provider_order' where target_id=(first->'result'->>'id')::uuid;
 s:=claim_checkout_payment('00000000-0000-4000-8000-000000000003','order',(first->'result'->>'id')::uuid,'upi');
 if not(s->>'claimed')::boolean then raise exception 'First UPI claim failed'; end if;
 s:=claim_checkout_payment('00000000-0000-4000-8000-000000000003','order',(first->'result'->>'id')::uuid,'upi');
 if (s->>'claimed')::boolean then raise exception 'Second UPI claim allowed duplicate'; end if;
 s:=claim_payment_reconciliation('order',(first->'result'->>'id')::uuid);
 if not(s->>'claimed')::boolean then raise exception 'Reconciliation lease not granted'; end if;
 s:=claim_payment_reconciliation('order',(first->'result'->>'id')::uuid);
 if (s->>'claimed')::boolean then raise exception 'Reconciliation lease granted twice'; end if;
 if has_function_privilege('authenticated','create_checkout_attempt(uuid,uuid,text,text,jsonb)','execute')
 or has_table_privilege('anon','checkout_payment_sessions','select') then raise exception 'Client can bypass backend'; end if;
end $$;
select 'Checkout replay, stock conservation, closing fence and provider creation claims passed' as result;

do $$ declare a jsonb; b jsonb; args jsonb; begin
 if current_database()<>'flikk_checkout_tests' then raise exception 'Use isolated test database'; end if;
 args:=jsonb_build_object('p_address_id','00000000-0000-4000-8000-000000000002','p_item_total',20,'p_delivery_fee',35,'p_total',55,'p_discount_amount',0,'p_handling_fee',0,'p_payment_method','online','p_legs',jsonb_build_array(
 jsonb_build_object('store_id','00000000-0000-4000-8000-000000000010','item_total',10,'commission_amount',1,'items',jsonb_build_array(jsonb_build_object('product_id','00000000-0000-4000-8000-000000000100','quantity',1,'unit_price_at_order',10,'unit_at_order','1 pc','variant_mrp_at_order',15))),
 jsonb_build_object('store_id','00000000-0000-4000-8000-000000000020','item_total',10,'commission_amount',1,'items',jsonb_build_array(jsonb_build_object('product_id','00000000-0000-4000-8000-000000000200','quantity',1,'unit_price_at_order',10,'unit_at_order','1 pc','variant_mrp_at_order',15)))));
 a:=create_checkout_attempt('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000904','trip','trip',args);
 b:=create_checkout_attempt('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000904','trip','trip',args);
 if a->'result'<>b->'result' or not(b->>'replayed')::boolean then raise exception 'Trip replay changed'; end if;
 if (select count(*) from orders where trip_id=(a->'result'->>'id')::uuid)<>2 then raise exception 'Trip replay duplicated legs'; end if;
 begin perform claim_checkout_payment('00000000-0000-4000-8000-000000000099','trip',(a->'result'->>'id')::uuid,'order'); raise exception 'Another customer claimed payment'; exception when sqlstate 'P0403' then null; end;
end $$;
select 'Trip replay and cross-account payment rejection passed';
