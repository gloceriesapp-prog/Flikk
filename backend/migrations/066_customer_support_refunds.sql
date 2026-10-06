-- After 065. Customer APIs use ownership-scoped service queries/RPCs.
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references users(id),
 order_id uuid references orders(id), trip_id uuid references trips(id),
 category text not null check(category in ('missing_items','damaged_products','payment','delivery','general')),
 status text not null default 'open' check(status in ('open','in_progress','resolved')),
 request_id uuid not null, initial_message text not null check(length(initial_message) between 10 and 2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(num_nonnulls(order_id,trip_id)<=1),
 check(category='general' or num_nonnulls(order_id,trip_id)=1),
 unique(customer_id,request_id)
);
create unique index support_active_issue on support_tickets(customer_id,coalesce(order_id,trip_id,'00000000-0000-0000-0000-000000000000'::uuid),category) where status<>'resolved';
create index support_customer_history on support_tickets(customer_id,created_at desc,id desc);
create index support_inbox on support_tickets(status,updated_at desc);
create table public.support_messages (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references support_tickets(id),
 actor_id uuid not null references users(id), actor_role text not null check(actor_role in ('customer','admin')),
 request_id uuid not null, body text not null check(length(body) between 1 and 2000),
 status_after text not null check(status_after in ('open','in_progress','resolved')),
 created_at timestamptz not null default now(),unique(ticket_id,request_id)
);
create index support_message_thread on support_messages(ticket_id,created_at,id);
create index support_message_rate_limit on support_messages(actor_id,created_at);
alter table support_tickets enable row level security;
alter table support_messages enable row level security;

-- Record every creation request, including requests deduplicated into an
-- existing case. Replays remain immutable even after the case is resolved.
create table public.support_ticket_requests (
 customer_id uuid not null references users(id), request_id uuid not null,
 ticket_id uuid not null references support_tickets(id),
 order_id uuid, trip_id uuid, category text not null, body text not null,
 created_at timestamptz not null default now(),
 primary key(customer_id,request_id)
);
create index support_request_rate_limit on support_ticket_requests(customer_id,created_at);
alter table support_ticket_requests enable row level security;
revoke all on table public.support_ticket_requests from public,anon,authenticated;
grant all on table public.support_ticket_requests to service_role;

create function public.create_customer_ticket(p_customer_id uuid,p_request_id uuid,p_order_id uuid,p_trip_id uuid,p_category text,p_message text) returns uuid
language plpgsql security definer set search_path=public as $$
declare t support_tickets; previous public.support_ticket_requests;
begin
 -- Serialize issue deduplication and limits across backend replicas.
 perform pg_advisory_xact_lock(hashtextextended('support:'||p_customer_id::text,0));
 select * into previous from support_ticket_requests where customer_id=p_customer_id and request_id=p_request_id;
 if found then
  if previous.order_id is distinct from p_order_id or previous.trip_id is distinct from p_trip_id
   or previous.category<>p_category or previous.body<>p_message then
   raise exception using errcode='P0409',message='Request ID reused with different details'; end if;
  return previous.ticket_id;
 end if;
 if (select count(*) from support_ticket_requests where customer_id=p_customer_id and created_at>now()-interval '24 hours')>=200 then raise exception using errcode='P0429',message='Too many support submissions'; end if;
 if p_order_id is not null and not exists(select 1 from orders where id=p_order_id and customer_id=p_customer_id) then raise exception using errcode='P0404',message='Order not found'; end if;
 if p_trip_id is not null and not exists(select 1 from trips where id=p_trip_id and customer_id=p_customer_id) then raise exception using errcode='P0404',message='Trip not found'; end if;
 select * into t from support_tickets where customer_id=p_customer_id and status<>'resolved' and category=p_category
  and order_id is not distinct from p_order_id and trip_id is not distinct from p_trip_id;
 if found then
  if t.initial_message<>p_message then perform reply_support_ticket(t.id,p_customer_id,p_request_id,p_message,null); end if;
  insert into support_ticket_requests(customer_id,request_id,ticket_id,order_id,trip_id,category,body) values(p_customer_id,p_request_id,t.id,p_order_id,p_trip_id,p_category,p_message);
  return t.id;
 end if;
 if (select count(*) from support_tickets where customer_id=p_customer_id and created_at>now()-interval '24 hours')>=20 then raise exception using errcode='P0429',message='Too many support requests'; end if;
 insert into support_tickets(customer_id,request_id,order_id,trip_id,category,initial_message)
 values(p_customer_id,p_request_id,p_order_id,p_trip_id,p_category,p_message) returning * into t;
 insert into support_ticket_requests(customer_id,request_id,ticket_id,order_id,trip_id,category,body) values(p_customer_id,p_request_id,t.id,p_order_id,p_trip_id,p_category,p_message);
 insert into support_messages(ticket_id,actor_id,actor_role,request_id,body,status_after) values(t.id,p_customer_id,'customer',p_request_id,p_message,'open');
 return t.id;
end $$;

create function public.reply_support_ticket(p_ticket_id uuid,p_actor_id uuid,p_request_id uuid,p_body text,p_status text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare t support_tickets; m support_messages; actor text; next_status text; owner_id uuid;
begin
 select role into actor from users where id=p_actor_id;
 select customer_id into owner_id from support_tickets where id=p_ticket_id;
 if owner_id is not null then perform pg_advisory_xact_lock(hashtextextended('support:'||owner_id::text,0)); end if;
 select * into t from support_tickets where id=p_ticket_id for update;
 if not found or (actor is distinct from 'admin' and (actor is distinct from 'customer' or t.customer_id<>p_actor_id)) then raise exception using errcode='P0404',message='Ticket not found'; end if;
 select * into m from support_messages where ticket_id=t.id and request_id=p_request_id;
 if found then
  if m.actor_id<>p_actor_id or m.body<>p_body or (p_status is not null and m.status_after<>p_status) then raise exception using errcode='P0409',message='Message request changed'; end if;
  return m.id;
 end if;
 if actor='customer' and p_status is not null then raise exception using errcode='P0403',message='Only support can resolve a ticket'; end if;
 if (select count(*) from support_messages where actor_id=p_actor_id and created_at>now()-interval '1 minute')>=10 then raise exception using errcode='P0429',message='Please wait before sending another message'; end if;
 next_status:=case when actor='customer' and t.status='resolved' then 'open' else coalesce(p_status,t.status) end;
 insert into support_messages(ticket_id,actor_id,actor_role,request_id,body,status_after) values(t.id,p_actor_id,actor,p_request_id,p_body,next_status) returning * into m;
 update support_tickets set status=next_status,updated_at=now() where id=t.id;
 return m.id;
end $$;

-- Append-only refund status history. Historical rows keep known dates rather
-- than inventing an initiation date. Destination is truthful for legacy data.
alter table orders add column refund_updated_at timestamptz;
create table public.customer_refund_updates (
 id bigint generated always as identity primary key,
 kind text not null check(kind in ('order','trip')), target_id uuid not null,
 status text not null, amount numeric not null, reason text,
 destination text not null default 'Original payment method', created_at timestamptz not null default now()
);
create index customer_refund_updates_target on customer_refund_updates(kind,target_id,created_at,id);
alter table customer_refund_updates enable row level security;
create function public.record_order_refund_update() returns trigger language plpgsql set search_path=public as $$
begin
 if new.refund_status is distinct from old.refund_status and new.refund_status<>'none' then
  new.refund_updated_at:=now();
  insert into customer_refund_updates(kind,target_id,status,amount,reason) values('order',new.id,new.refund_status,new.total,new.cancel_reason);
 end if;
 return new;
end $$;
create trigger orders_refund_history before update of refund_status on orders for each row execute function record_order_refund_update();
create function public.record_trip_refund_update() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='INSERT' or new.status is distinct from old.status then
  insert into customer_refund_updates(kind,target_id,status,amount,reason) values('trip',new.trip_id,new.status,new.target_paise/100.0,'Multi-shop order cancelled');
 end if;
 return new;
end $$;
create trigger trips_refund_history after insert or update of status on trip_refunds for each row execute function record_trip_refund_update();

create view public.customer_refund_history as
 select 'order:'||o.id::text as id,'order'::text as kind,o.id as target_id,o.customer_id,o.order_number::text as reference,
 o.total as amount,o.refund_status as status,coalesce(o.cancel_reason,'Order refund') as reason,
 'Original payment method'::text as destination,o.placed_at as order_placed_at,
 coalesce(o.refund_updated_at,o.refunded_at) as updated_at
 from orders o where o.refund_status<>'none' and not exists(select 1 from trip_refunds r where r.trip_id=o.trip_id)
 union all
 select 'trip:'||t.id::text,'trip',t.id,t.customer_id,'Multi-shop order',r.target_paise/100.0,r.status,
 'Multi-shop order cancelled','Original payment method',t.created_at,r.updated_at
 from trip_refunds r join trips t on t.id=r.trip_id;
revoke all on table public.support_tickets,public.support_messages,public.customer_refund_updates,public.customer_refund_history from public,anon,authenticated;
grant all on table public.support_tickets,public.support_messages,public.customer_refund_updates,public.customer_refund_history to service_role;
grant usage,select on sequence public.customer_refund_updates_id_seq to service_role;
revoke all on function public.create_customer_ticket(uuid,uuid,uuid,uuid,text,text),public.reply_support_ticket(uuid,uuid,uuid,text,text),public.record_order_refund_update(),public.record_trip_refund_update() from public,anon,authenticated;
grant execute on function public.create_customer_ticket(uuid,uuid,uuid,uuid,text,text),public.reply_support_ticket(uuid,uuid,uuid,text,text) to service_role;
