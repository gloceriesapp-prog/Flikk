\set ON_ERROR_STOP on
do $$ begin if current_database()<>'flikk_checkout_tests' then raise exception 'Use isolated fixture'; end if; end $$;
alter table users add column if not exists expo_push_token text;
drop trigger if exists customer_order_notification on orders;
drop function if exists record_customer_order_notification();
drop function if exists claim_customer_notifications(integer);
drop function if exists register_customer_push_device(uuid,uuid,text,bigint);
drop table if exists customer_notifications;
drop table if exists customer_push_devices;
\i backend/migrations/067_customer_notifications.sql
begin;
do $$ declare o orders;install uuid:=gen_random_uuid();lease uuid; begin
 o:=test_order(1);
 insert into users(id,role) values('00000000-0000-4000-8000-000000000090','customer') on conflict do nothing;
 perform register_customer_push_device(o.customer_id,install,'ExpoPushToken[test-device]',100);
 perform register_customer_push_device('00000000-0000-4000-8000-000000000090',install,'ExpoPushToken[test-device]',102);
 perform register_customer_push_device(o.customer_id,install,'ExpoPushToken[old-delayed-token]',101);
 if (select customer_id from customer_push_devices where installation_id=install)<> '00000000-0000-4000-8000-000000000090' then raise exception 'Old account reclaimed device'; end if;
 update customer_push_devices set token='disabled:'||install::text,revision=103 where installation_id=install;
 perform register_customer_push_device(o.customer_id,install,'ExpoPushToken[test-device]',102);
 if (select token from customer_push_devices where installation_id=install) not like 'disabled:%' then raise exception 'Delayed registration reclaimed logout';end if;
 update orders set status='packed' where id=o.id;
 update orders set status='packed' where id=o.id;
 if (select count(*) from customer_notifications where order_id=o.id and event='packed')<>1 then raise exception 'Duplicate status notification';end if;
 perform * from claim_customer_notifications(50);
 if exists(select 1 from claim_customer_notifications(50)) then raise exception 'Leased jobs claimed twice';end if;
 if has_table_privilege('authenticated','customer_notifications','select') or has_function_privilege('authenticated','register_customer_push_device(uuid,uuid,text,bigint)','execute') then raise exception 'Private notifications leaked';end if;
end $$;
rollback;
select 'Device account transfer, stale registration, logout tombstone, inbox deduplication, leases and private permissions passed' as result;
