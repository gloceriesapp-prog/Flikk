-- Deploy after 064. Cancellation and inventory release commit together;
-- external refunds are durable work, never performed inside this transaction.
create table public.trip_refunds (
 id uuid primary key default gen_random_uuid(),
 trip_id uuid not null unique references public.trips(id),
 payment_id text not null,
 target_paise bigint not null check(target_paise > 0),
 request_paise bigint check(request_paise > 0),
 refunded_paise bigint not null default 0,
 status text not null default 'queued' check(status in ('queued','processing','completed','failed')),
 provider_refund_id text,
 lease_token uuid,
 lease_until timestamptz,
 next_attempt_at timestamptz not null default now(),
 attempts integer not null default 0,
 last_error text,
 updated_at timestamptz not null default now()
);
alter table public.trip_refunds enable row level security;
create index trip_refunds_due on public.trip_refunds(next_attempt_at) where status in ('queued','processing');

create function public.enqueue_trip_refund(p_trip_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare t public.trips;
begin
 select * into t from trips where id=p_trip_id for update;
 if t.status='cancelled' and t.razorpay_payment_id is not null and t.total>0 then
  insert into trip_refunds(trip_id,payment_id,target_paise)
  values(t.id,t.razorpay_payment_id,round(t.total*100)::bigint) on conflict(trip_id) do nothing;
 end if;
end $$;

create function public.cancel_customer_trip(p_trip_id uuid,p_customer_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare t public.trips; blocked boolean; outcomes jsonb;
begin
 select * into t from trips where id=p_trip_id and customer_id=p_customer_id for update;
 if not found then raise exception using errcode='P0404',message='Trip not found'; end if;
 perform 1 from orders where trip_id=t.id order by id for update;
 if not exists(select 1 from orders where trip_id=t.id) then
  raise exception using errcode='P0409',message='Trip has no shop orders'; end if;
 blocked:=exists(select 1 from orders where trip_id=t.id and status not in ('placed','packed','cancelled'));
 -- Same lock order as payment settlement and reservation expiry.
 if not blocked then
  perform 1 from products where id in(select product_id from inventory_reservations
   where order_id in(select id from orders where trip_id=t.id) and state in ('held','committed')) order by id for update;
  update orders set status='cancelled',cancel_reason=p_reason where trip_id=t.id and status in ('placed','packed');
  update trips set status='cancelled' where id=t.id;
  perform enqueue_trip_refund(t.id);
 end if;
 select jsonb_agg(jsonb_build_object('order_id',o.id,'store_name',s.name,'status',o.status,'refund_status',o.refund_status,
  'outcome',case when o.status='cancelled' then 'cancelled' when o.status in ('placed','packed') then 'not_cancelled' else 'blocked' end)
  order by o.placed_at,o.id) into outcomes from orders o join stores s on s.id=o.store_id where o.trip_id=t.id;
 return jsonb_build_object('outcome',case when blocked then 'blocked' else 'cancelled' end,'shops',outcomes);
end $$;

create function public.claim_trip_refunds() returns setof public.trip_refunds
language plpgsql security definer set search_path=public as $$
begin
 return query with due as(select id from trip_refunds where status in ('queued','processing')
  and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by next_attempt_at limit 10 for update skip locked)
 update trip_refunds r set lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1
 from due where r.id=due.id returning r.*;
end $$;
revoke all on table public.trip_refunds from public,anon,authenticated;
grant all on table public.trip_refunds to service_role;
revoke all on function public.enqueue_trip_refund(uuid),public.cancel_customer_trip(uuid,uuid,text),public.claim_trip_refunds() from public,anon,authenticated;
grant execute on function public.enqueue_trip_refund(uuid),public.cancel_customer_trip(uuid,uuid,text),public.claim_trip_refunds() to service_role;
