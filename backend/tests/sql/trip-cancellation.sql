\set ON_ERROR_STOP on
do $$ begin if current_database()<>'flikk_checkout_tests' then raise exception 'Use isolated test database'; end if; end $$;
create or replace function test_cancel_trip(method text default 'online') returns trips language sql as $$
 select create_trip_orders('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',35,20,53,
 jsonb_build_array(
 jsonb_build_object('store_id','00000000-0000-4000-8000-000000000010','item_total',10,'commission_amount',1,'items',jsonb_build_array(jsonb_build_object('product_id','00000000-0000-4000-8000-000000000100','quantity',1,'unit_price_at_order',10))),
 jsonb_build_object('store_id','00000000-0000-4000-8000-000000000020','item_total',10,'commission_amount',1,'items',jsonb_build_array(jsonb_build_object('product_id','00000000-0000-4000-8000-000000000200','quantity',1,'unit_price_at_order',10)))
 ),null,2,method,0)
$$;
do $$ declare t trips; result jsonb; stock_before integer; leg uuid; begin
 select stock_quantity into stock_before from products where id='00000000-0000-4000-8000-000000000100';
 t:=test_cancel_trip();
 perform settle_checkout_payment(null,t.id,'cancellation-payment');
 result:=cancel_customer_trip(t.id,t.customer_id,'Changed mind');
 if result->>'outcome'<>'cancelled' or jsonb_array_length(result->'shops')<>2 then raise exception 'Missing shop outcomes'; end if;
 if exists(select 1 from orders where trip_id=t.id and status<>'cancelled') then raise exception 'Partial cancellation'; end if;
 if (select target_paise from trip_refunds where trip_id=t.id)<>5300 then raise exception 'Refund excluded fees or ignored discount'; end if;
 perform cancel_customer_trip(t.id,t.customer_id,'Retry');
 if (select count(*) from trip_refunds where trip_id=t.id)<>1 then raise exception 'Duplicate refund job'; end if;
 if (select stock_quantity from products where id='00000000-0000-4000-8000-000000000100')<>stock_before then raise exception 'Inventory released twice or not released'; end if;
 begin perform cancel_customer_trip(t.id,'00000000-0000-4000-8000-000000000099','Other account'); raise exception 'Ownership bypass'; exception when sqlstate 'P0404' then null; end;
 t:=test_cancel_trip('cod');
 select id into leg from orders where trip_id=t.id order by id limit 1;
 update orders set status='packed' where id=leg;
 update orders set status='out_for_delivery' where id=leg;
 result:=cancel_customer_trip(t.id,t.customer_id,'Too late');
 if result->>'outcome'<>'blocked' then raise exception 'Picked-up trip cancelled'; end if;
 if exists(select 1 from orders where trip_id=t.id and status='cancelled') then raise exception 'Eligible sibling cancelled partially'; end if;
 if exists(select 1 from trip_refunds where trip_id=t.id) then raise exception 'Blocked cancellation queued refund'; end if;
 t:=test_cancel_trip();
 perform cancel_customer_trip(t.id,t.customer_id,'Unpaid cancel');
 if exists(select 1 from trip_refunds where trip_id=t.id) then raise exception 'Unpaid refund created'; end if;
 perform settle_checkout_payment(null,t.id,'late-cancelled-payment');
 perform enqueue_trip_refund(t.id);
 if (select count(*) from trip_refunds where trip_id=t.id)<>1 then raise exception 'Late payment not queued'; end if;
 if has_function_privilege('authenticated','cancel_customer_trip(uuid,uuid,text)','execute') or has_table_privilege('anon','trip_refunds','select') then raise exception 'Cancellation permissions leaked'; end if;
end $$;
select 'Atomic cancellation, fee/discount refund, ownership, stock conservation and late capture passed' as result;
