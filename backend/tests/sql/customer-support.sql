\set ON_ERROR_STOP on
do $$ begin if current_database()<>'flikk_checkout_tests' then raise exception 'Use isolated fixture'; end if; end $$;
insert into users(id,role) values('00000000-0000-4000-8000-000000000080','admin'),('00000000-0000-4000-8000-000000000090','customer') on conflict(id) do update set role=excluded.role;
do $$ declare o orders;t uuid;again uuid;m uuid;trip trips;before_updates integer;dedup_request uuid:=gen_random_uuid();request uuid:=gen_random_uuid(); begin
 o:=test_order(1);
 t:=create_customer_ticket(o.customer_id,request,o.id,null,'missing_items','One item is missing from my order');
 again:=create_customer_ticket(o.customer_id,request,o.id,null,'missing_items','One item is missing from my order');
 if t<>again or (select count(*) from support_messages where ticket_id=t)<>1 then raise exception 'Duplicate initial ticket/message'; end if;
 again:=create_customer_ticket(o.customer_id,dedup_request,o.id,null,'missing_items','Retry after restart with missing item');
 if t<>again then raise exception 'Duplicate active issue'; end if;
 begin perform create_customer_ticket(o.customer_id,request,o.id,null,'payment','A different payment question');raise exception 'Mutated replay allowed'; exception when sqlstate 'P0409' then null;end;
 begin perform create_customer_ticket('00000000-0000-4000-8000-000000000090',gen_random_uuid(),o.id,null,'payment','Payment issue for another customer');raise exception 'Foreign order allowed';exception when sqlstate 'P0404' then null;end;
 begin perform reply_support_ticket(t,'00000000-0000-4000-8000-000000000090',gen_random_uuid(),'Read someone else ticket');raise exception 'Foreign ticket allowed';exception when sqlstate 'P0404' then null;end;
 begin perform reply_support_ticket(t,o.customer_id,gen_random_uuid(),'Resolve my own case','resolved');raise exception 'Customer resolved case';exception when sqlstate 'P0403' then null;end;
 request:=gen_random_uuid();
 m:=reply_support_ticket(t,'00000000-0000-4000-8000-000000000080',request,'We have reviewed your order and resolved your issue.','resolved');
 again:=reply_support_ticket(t,'00000000-0000-4000-8000-000000000080',request,'We have reviewed your order and resolved your issue.','resolved');
 if m<>again then raise exception 'Duplicate reply created';end if;
 if (select status from support_tickets where id=t)<>'resolved' then raise exception 'Admin resolution not saved';end if;
 again:=create_customer_ticket(o.customer_id,dedup_request,o.id,null,'missing_items','Retry after restart with missing item');
 if again<>t or (select status from support_tickets where id=t)<>'resolved' then raise exception 'Deduplicated replay reopened or duplicated resolved case';end if;
 begin perform create_customer_ticket(o.customer_id,dedup_request,o.id,null,'missing_items','Changed request payload after resolve');raise exception 'Mutated deduplicated request allowed';exception when sqlstate 'P0409' then null;end;
 perform reply_support_ticket(t,o.customer_id,gen_random_uuid(),'I still need help with this order.');
 if (select status from support_tickets where id=t)<>'open' then raise exception 'Follow-up did not reopen case';end if;
 -- Real state transitions append exactly one event, including provider finality.
 select count(*) into before_updates from customer_refund_updates;
 update orders set refund_status='processing',cancel_reason='Changed mind' where id=o.id;
 update orders set refund_status='processing' where id=o.id;
 update orders set refund_status='completed',refunded_at=now() where id=o.id;
 if (select count(*) from customer_refund_updates)<>before_updates+2 then raise exception 'Refund history duplicate or missing';end if;
 if not exists(select 1 from customer_refund_history where customer_id=o.customer_id and target_id=o.id and status='completed' and amount=o.total) then raise exception 'Order refund summary wrong';end if;
 trip:=test_cancel_trip();perform settle_checkout_payment(null,trip.id,'support-refund-payment');perform cancel_customer_trip(trip.id,trip.customer_id,'Changed mind');
 -- Legacy per-shop refunds must not duplicate a combined trip refund.
 update orders set refund_status='processing' where trip_id=trip.id;
 if (select count(*) from customer_refund_history where target_id=trip.id or target_id in(select id from orders where trip_id=trip.id))<>1 then raise exception 'Shared payment duplicated';end if;
 if (select amount from customer_refund_history where kind='trip' and target_id=trip.id)<>53 then raise exception 'Trip fee/discount refund wrong';end if;
 update trip_refunds set status='completed' where trip_id=trip.id;
 if (select count(*) from customer_refund_updates where kind='trip' and target_id=trip.id)<>2 then raise exception 'Trip update missing';end if;
 if has_table_privilege('authenticated','support_messages','select') or has_function_privilege('anon','reply_support_ticket(uuid,uuid,uuid,text,text)','execute') or has_table_privilege('authenticated','customer_refund_history','select') then raise exception 'Support permission leak';end if;
end $$;
select 'Ticket ownership, active-case deduplication, replay, admin reply, reopening and refund history passed' as result;
