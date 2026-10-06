-- Account-owned inbox and transactional push outbox. Service role only.
begin;
create table public.customer_push_devices (
 installation_id uuid primary key, customer_id uuid not null references public.users(id) on delete cascade,
 token text not null unique, revision bigint not null check(revision > 0), updated_at timestamptz not null default now()
);
create index customer_push_devices_customer on public.customer_push_devices(customer_id);
create table public.customer_notifications (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.users(id) on delete cascade,
 order_id uuid not null references public.orders(id) on delete cascade, trip_id uuid,
 event text not null, title text not null, body text not null, created_at timestamptz not null default now(), read_at timestamptz,
 push_sent_at timestamptz, attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz, unique(order_id,event)
);
create index customer_notifications_page on public.customer_notifications(customer_id,created_at desc,id desc);
create index customer_notifications_due on public.customer_notifications(next_attempt_at) where push_sent_at is null and attempts < 6;
alter table public.customer_push_devices enable row level security;
alter table public.customer_notifications enable row level security;
revoke all on public.customer_push_devices, public.customer_notifications from anon, authenticated;
grant all on public.customer_push_devices, public.customer_notifications to service_role;
create function public.register_customer_push_device(p_customer_id uuid,p_installation_id uuid,p_token text,p_revision bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
 -- Serialize transfers, including a token rotating between installation IDs.
 perform pg_advisory_xact_lock(k) from (select distinct hashtextextended(v,0) k from unnest(array['push-install:'||p_installation_id::text,'push-token:'||p_token,'push-customer:'||p_customer_id::text]) v order by k) locks;
 if exists(select 1 from customer_push_devices where installation_id=p_installation_id and revision >= p_revision) then return; end if;
 if (select count(*) from customer_push_devices where customer_id=p_customer_id and token not like 'disabled:%' and installation_id<>p_installation_id)>=10 then raise exception using errcode='P0409',message='Device limit reached'; end if;
 delete from customer_push_devices where token=p_token and installation_id<>p_installation_id;
 insert into customer_push_devices(installation_id,customer_id,token,revision) values(p_installation_id,p_customer_id,p_token,p_revision)
 on conflict(installation_id) do update set customer_id=excluded.customer_id,token=excluded.token,revision=excluded.revision,updated_at=now() where customer_push_devices.revision < excluded.revision;
 -- Retire legacy customer tokens on this device; partner/rider registration is unchanged.
 update users set expo_push_token=null where role='customer' and (expo_push_token=p_token or id=p_customer_id);
end $$;
create function public.record_customer_order_notification() returns trigger language plpgsql security definer set search_path=public as $$
declare heading text; copy text;
begin
 if TG_OP='UPDATE' then
  if new.status=old.status and not (new.status='placed' and old.razorpay_payment_id is null and new.razorpay_payment_id is not null) then return new; end if;
 end if;
 if new.status='placed' and new.payment_method='online' and new.razorpay_payment_id is null then return new; end if;
 case new.status
 when 'placed' then heading:='Order received'; copy:='Your shop is preparing your order.';
 when 'packed' then heading:='Your order is packed'; copy:='We are getting your delivery ready.';
 when 'out_for_delivery' then heading:='Your order is on the way'; copy:='Open your order to follow its arrival.';
 when 'delivered' then heading:='Order delivered'; copy:='Your delivery is complete. View your order details.';
 when 'cancelled' then heading:='Order cancelled'; copy:='View your order for cancellation and payment updates.';
 when 'failed' then heading:='Delivery update'; copy:='Open your order for the latest delivery information.';
 else return new;
 end case;
 insert into customer_notifications(customer_id,order_id,trip_id,event,title,body)
 values(new.customer_id,new.id,new.trip_id,new.status,heading,copy) on conflict(order_id,event) do nothing;
 return new;
end $$;
create trigger customer_order_notification after insert or update of status,razorpay_payment_id on public.orders
for each row execute function public.record_customer_order_notification();
create function public.claim_customer_notifications(p_limit integer default 50)
returns setof public.customer_notifications language sql security definer set search_path=public as $$
 update customer_notifications set lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1
 where id in (select id from customer_notifications where push_sent_at is null and attempts<6 and next_attempt_at<=now()
 and (lease_until is null or lease_until<now()) order by next_attempt_at limit least(greatest(p_limit,1),50) for update skip locked)
 returning *;
$$;
revoke all on function public.register_customer_push_device(uuid,uuid,text,bigint), public.record_customer_order_notification(), public.claim_customer_notifications(integer) from public,anon,authenticated;
grant execute on function public.register_customer_push_device(uuid,uuid,text,bigint), public.claim_customer_notifications(integer) to service_role;
commit;
