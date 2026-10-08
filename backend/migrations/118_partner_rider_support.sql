-- Partner/rider support, admin attention counts and SQL-aggregated admin
-- dashboards. Requires 001..112.
-- 1. app_release_config (112, one row per app) gains support_phone,
--    support_email and support_whatsapp: the partner and rider apps' help
--    contacts, edited on admin "App settings" and served by the backend at
--    GET /app-config/support/:app. The customer app keeps app_content's.
-- 2. support_tickets gains requester_role ('customer' | 'rider' |
--    'store_owner', default 'customer' so every existing ticket stays a
--    customer ticket). Riders and store owners use their own categories
--    (order_issue, payout, app_issue, account, general), may optionally link
--    one of their own orders, and never link a trip. support_messages accepts
--    rider/store_owner authors. The active-issue dedup index is per role.
-- 3. create_customer_ticket (latest: 066) only deduplicates into customer
--    tickets; reply_support_ticket (latest: 066) lets the ticket's own
--    requester reply in their role. Only support (admin) sets a status.
-- 4. create_staff_support_ticket: rider/store_owner ticket creation with the
--    same request-id replay, active-issue dedup and rate limits as customers.
-- 5. admin_overview_stats(now): the admin Overview numbers as SQL aggregates
--    (the JS reduction over fetched rows stopped at PostgREST's 1,000 rows).
-- 6. admin_revenue_trend(): weekly (IST, Monday) commission + platform fee.
-- 7. admin_attention_counts(now, stuck_minutes): the admin bell's counts.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- 1. Partner/rider help contacts (same formats as app_content, migration 100).
ALTER TABLE public.app_release_config
  ADD COLUMN IF NOT EXISTS support_phone text
    CHECK (support_phone IS NULL OR support_phone ~ '^\+[1-9][0-9]{7,14}$'),
  ADD COLUMN IF NOT EXISTS support_email text
    CHECK (support_email IS NULL OR (support_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(support_email) <= 254)),
  ADD COLUMN IF NOT EXISTS support_whatsapp text
    CHECK (support_whatsapp IS NULL OR support_whatsapp ~ '^\+[1-9][0-9]{7,14}$');

-- 2. Requester role on support tickets.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS requester_role text NOT NULL DEFAULT 'customer'
    CHECK (requester_role IN ('customer','rider','store_owner'));
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_check1;
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_role_category_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_role_category_check CHECK (
  CASE WHEN requester_role = 'customer'
    THEN category IN ('missing_items','damaged_products','payment','delivery','general')
      AND (category = 'general' OR num_nonnulls(order_id, trip_id) = 1)
    ELSE category IN ('order_issue','payout','app_issue','account','general') AND trip_id IS NULL
  END);
ALTER TABLE public.support_messages DROP CONSTRAINT IF EXISTS support_messages_actor_role_check;
ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_actor_role_check
  CHECK (actor_role IN ('customer','rider','store_owner','admin'));
DROP INDEX IF EXISTS public.support_active_issue;
CREATE UNIQUE INDEX support_active_issue ON public.support_tickets
  (customer_id, requester_role, coalesce(order_id, trip_id, '00000000-0000-0000-0000-000000000000'::uuid), category)
  WHERE status <> 'resolved';
CREATE INDEX IF NOT EXISTS support_role_inbox ON public.support_tickets (requester_role, status, created_at DESC, id DESC);

-- 3. 066's create_customer_ticket, deduplicating into customer tickets only.
create or replace function public.create_customer_ticket(p_customer_id uuid,p_request_id uuid,p_order_id uuid,p_trip_id uuid,p_category text,p_message text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
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
 select * into t from support_tickets where customer_id=p_customer_id and requester_role='customer' and status<>'resolved' and category=p_category
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
REVOKE ALL ON FUNCTION public.create_customer_ticket(uuid,uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_ticket(uuid,uuid,uuid,uuid,text,text) TO service_role;

-- 066's reply_support_ticket: the requester replies in the role the ticket
-- was raised under; only admin (support) sets a status.
create or replace function public.reply_support_ticket(p_ticket_id uuid,p_actor_id uuid,p_request_id uuid,p_body text,p_status text default null) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare t support_tickets; m support_messages; actor text; next_status text; owner_id uuid;
begin
 select role into actor from users where id=p_actor_id;
 select customer_id into owner_id from support_tickets where id=p_ticket_id;
 if owner_id is not null then perform pg_advisory_xact_lock(hashtextextended('support:'||owner_id::text,0)); end if;
 select * into t from support_tickets where id=p_ticket_id for update;
 if not found or (actor is distinct from 'admin' and (actor is distinct from t.requester_role or t.customer_id<>p_actor_id)) then raise exception using errcode='P0404',message='Ticket not found'; end if;
 select * into m from support_messages where ticket_id=t.id and request_id=p_request_id;
 if found then
  if m.actor_id<>p_actor_id or m.body<>p_body or (p_status is not null and m.status_after<>p_status) then raise exception using errcode='P0409',message='Message request changed'; end if;
  return m.id;
 end if;
 if actor<>'admin' and p_status is not null then raise exception using errcode='P0403',message='Only support can resolve a ticket'; end if;
 if (select count(*) from support_messages where actor_id=p_actor_id and created_at>now()-interval '1 minute')>=10 then raise exception using errcode='P0429',message='Please wait before sending another message'; end if;
 next_status:=case when actor<>'admin' and t.status='resolved' then 'open' else coalesce(p_status,t.status) end;
 insert into support_messages(ticket_id,actor_id,actor_role,request_id,body,status_after) values(t.id,p_actor_id,actor,p_request_id,p_body,next_status) returning * into m;
 update support_tickets set status=next_status,updated_at=now() where id=t.id;
 return m.id;
end $$;
REVOKE ALL ON FUNCTION public.reply_support_ticket(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reply_support_ticket(uuid,uuid,uuid,text,text) TO service_role;

-- 4. Rider / store owner tickets. The role is read from users.role, never
--    trusted from the caller. A linked order must be the rider's own delivery
--    or an order of the owner's store.
create or replace function public.create_staff_support_ticket(p_user_id uuid,p_request_id uuid,p_order_id uuid,p_category text,p_message text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare t support_tickets; previous public.support_ticket_requests; requester text;
begin
 select role into requester from users where id=p_user_id;
 if requester is null or requester not in ('rider','store_owner') then raise exception using errcode='P0403',message='Only riders and store partners can raise these tickets'; end if;
 if p_category is null or p_category not in ('order_issue','payout','app_issue','account','general') then raise exception using errcode='P0400',message='Unknown category'; end if;
 perform pg_advisory_xact_lock(hashtextextended('support:'||p_user_id::text,0));
 select * into previous from support_ticket_requests where customer_id=p_user_id and request_id=p_request_id;
 if found then
  if previous.order_id is distinct from p_order_id or previous.trip_id is not null
   or previous.category<>p_category or previous.body<>p_message then
   raise exception using errcode='P0409',message='Request ID reused with different details'; end if;
  return previous.ticket_id;
 end if;
 if (select count(*) from support_ticket_requests where customer_id=p_user_id and created_at>now()-interval '24 hours')>=200 then raise exception using errcode='P0429',message='Too many support submissions'; end if;
 if p_order_id is not null and not exists(
   select 1 from orders o where o.id=p_order_id and (
     (requester='rider' and o.rider_id=p_user_id)
     or (requester='store_owner' and exists(select 1 from stores s where s.id=o.store_id and s.owner_user_id=p_user_id)))) then
  raise exception using errcode='P0404',message='Order not found'; end if;
 select * into t from support_tickets where customer_id=p_user_id and requester_role=requester and status<>'resolved' and category=p_category
  and order_id is not distinct from p_order_id;
 if found then
  if t.initial_message<>p_message then perform reply_support_ticket(t.id,p_user_id,p_request_id,p_message,null); end if;
  insert into support_ticket_requests(customer_id,request_id,ticket_id,order_id,trip_id,category,body) values(p_user_id,p_request_id,t.id,p_order_id,null,p_category,p_message);
  return t.id;
 end if;
 if (select count(*) from support_tickets where customer_id=p_user_id and created_at>now()-interval '24 hours')>=20 then raise exception using errcode='P0429',message='Too many support requests'; end if;
 insert into support_tickets(customer_id,requester_role,request_id,order_id,trip_id,category,initial_message)
  values(p_user_id,requester,p_request_id,p_order_id,null,p_category,p_message) returning * into t;
 insert into support_ticket_requests(customer_id,request_id,ticket_id,order_id,trip_id,category,body) values(p_user_id,p_request_id,t.id,p_order_id,null,p_category,p_message);
 insert into support_messages(ticket_id,actor_id,actor_role,request_id,body,status_after) values(t.id,p_user_id,requester,p_request_id,p_message,'open');
 return t.id;
end $$;
REVOKE ALL ON FUNCTION public.create_staff_support_ticket(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_support_ticket(uuid,uuid,uuid,text,text) TO service_role;

-- 5. Admin Overview numbers. Days are IST calendar days; the week is the
--    last 7 IST days plus today (as the route computed before).
create or replace function public.admin_overview_stats(p_now timestamptz default now()) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with bounds as (
    select (date_trunc('day', p_now at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata' as today,
           (date_trunc('day', p_now at time zone 'Asia/Kolkata') - interval '1 day') at time zone 'Asia/Kolkata' as yesterday,
           (date_trunc('day', p_now at time zone 'Asia/Kolkata') - interval '7 days') at time zone 'Asia/Kolkata' as week
  ), week_orders as (
    select o.status, o.placed_at, o.delivered_at from orders o, bounds b where o.placed_at >= b.week
  ), per_store as (
    select o.store_id, count(*) as total_orders, count(*) filter (where o.placed_at >= b.today) as daily_orders
    from orders o, bounds b where o.store_id is not null group by o.store_id
  ), top_stores as (
    select p.store_id, p.total_orders, p.daily_orders, s.name, s.district, s.rating
    from per_store p left join stores s on s.id = p.store_id
    order by p.total_orders desc, p.store_id limit 5
  )
  select jsonb_build_object(
    'totalOrdersToday', (select count(*) from orders o, bounds b where o.placed_at >= b.today),
    'ordersYesterday', (select count(*) from orders o, bounds b where o.placed_at >= b.yesterday and o.placed_at < b.today),
    'pendingOrders', (select count(*) from orders where status in ('placed','packed')),
    'activeStores', (select count(*) from stores where is_active),
    'activeRiders', (select count(*) from riders where is_active),
    'weekDelivered', (select count(*) from week_orders where status = 'delivered'),
    'weekCancelled', (select count(*) from week_orders where status = 'cancelled'),
    'avgDeliveryMinutes', coalesce((select round(avg(extract(epoch from (delivered_at - placed_at)) / 60))
      from week_orders where status = 'delivered' and delivered_at is not null), 0),
    'topStores', coalesce((select jsonb_agg(jsonb_build_object(
        'storeId', store_id, 'name', coalesce(name, 'Unknown store'), 'district', coalesce(district, ''),
        'rating', rating, 'dailyOrders', daily_orders, 'totalOrders', total_orders) order by total_orders desc, store_id)
      from top_stores), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.admin_overview_stats(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview_stats(timestamptz) TO service_role;

-- 6. Weekly revenue: commission + handling (platform) fee. A single-store
--    order counts in the IST week it was delivered. A multi-store trip counts
--    once, only when every leg is delivered, in the week its last leg was
--    delivered, with the trip-level handling fee (as the route computed).
create or replace function public.admin_revenue_trend()
returns table(week_start date, commission numeric, platform_fee numeric)
language sql stable security definer set search_path = public, pg_temp as $$
  with single_store as (
    select date_trunc('week', o.delivered_at at time zone 'Asia/Kolkata')::date as week,
           coalesce(o.commission_amount, 0) as commission, coalesce(o.handling_fee, 0) as fee
    from orders o
    where o.status = 'delivered' and o.trip_id is null and o.delivered_at is not null
  ), trip_legs as (
    select o.trip_id, bool_and(o.status = 'delivered' and o.delivered_at is not null) as all_delivered,
           max(o.delivered_at) as last_delivered_at, sum(coalesce(o.commission_amount, 0)) as commission
    from orders o where o.trip_id is not null group by o.trip_id
  ), trip_rows as (
    select date_trunc('week', l.last_delivered_at at time zone 'Asia/Kolkata')::date as week,
           l.commission, coalesce(t.handling_fee, 0) as fee
    from trip_legs l join trips t on t.id = l.trip_id
    where l.all_delivered
  )
  select week, sum(commission)::numeric, sum(fee)::numeric
  from (select * from single_store union all select * from trip_rows) rows
  group by week order by week;
$$;
REVOKE ALL ON FUNCTION public.admin_revenue_trend() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revenue_trend() TO service_role;

-- 7. Admin bell: everything that needs a human, as counts.
create or replace function public.admin_attention_counts(p_now timestamptz default now(), p_stuck_minutes integer default 20) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'pendingStoreApplications', (select count(*) from store_onboarding_drafts d join users u on u.id = d.user_id
      where d.submitted_at is not null and not coalesce(u.is_rejected, false)),
    'pendingRiderApplications', (select count(*) from rider_onboarding_drafts d join users u on u.id = d.user_id
      where d.submitted_at is not null and not coalesce(u.is_rejected, false)),
    'pendingProducts', (select count(*) from products where approval_status = 'pending' or pending_image_url is not null),
    'refundsNeedingAction', (select count(distinct coalesce(trip_id, id)) from orders where refund_status in ('failed','manual_required')),
    'openSupportTickets', (select count(*) from support_tickets where status = 'open'),
    'stuckOrders', (select count(*) from orders where rider_id is null and (
      (status = 'placed' and placed_at < p_now - make_interval(mins => greatest(p_stuck_minutes, 1)))
      or (status = 'packed' and coalesce(packed_at, placed_at) < p_now - make_interval(mins => greatest(p_stuck_minutes, 1)))))
  );
$$;
REVOKE ALL ON FUNCTION public.admin_attention_counts(timestamptz,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_attention_counts(timestamptz,integer) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
