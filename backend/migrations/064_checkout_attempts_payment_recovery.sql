-- Requires 062 + 063. Prepared migration: deploy before this API/app release.
begin;
create table public.checkout_attempts (
  customer_id uuid not null references public.users(id),
  attempt_id uuid not null,
  fingerprint text not null,
  kind text not null check(kind in ('order','trip')),
  result jsonb,
  abandoned boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(customer_id,attempt_id)
);
alter table public.checkout_attempts enable row level security;
create function public.create_checkout_attempt(p_customer_id uuid,p_attempt_id uuid,p_fingerprint text,p_kind text,p_args jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a checkout_attempts; v_result jsonb;
begin
  insert into checkout_attempts(customer_id,attempt_id,fingerprint,kind)
    values(p_customer_id,p_attempt_id,p_fingerprint,p_kind) on conflict do nothing;
  select * into a from checkout_attempts where customer_id=p_customer_id and attempt_id=p_attempt_id for update;
  if a.fingerprint<>p_fingerprint or a.kind<>p_kind then raise exception 'Attempt conflict' using errcode='P0409'; end if;
  if a.abandoned then raise exception 'Attempt closed' using errcode='P0410'; end if;
  if a.result is not null then return jsonb_build_object('result',a.result,'replayed',true); end if;
  if p_kind='order' then
    select to_jsonb(o) into v_result from create_order(p_customer_id,(p_args->>'p_store_id')::uuid,
      (p_args->>'p_address_id')::uuid,(p_args->>'p_item_total')::numeric,(p_args->>'p_delivery_fee')::numeric,
      (p_args->>'p_commission_amount')::numeric,(p_args->>'p_total')::numeric,p_args->'p_items',
      (p_args->>'p_promo_code_id')::uuid,(p_args->>'p_discount_amount')::numeric,p_args->>'p_payment_method',
      (p_args->>'p_handling_fee')::numeric) o;
  elsif p_kind='trip' then
    select to_jsonb(t) into v_result from create_trip_orders(p_customer_id,(p_args->>'p_address_id')::uuid,
      (p_args->>'p_delivery_fee')::numeric,(p_args->>'p_item_total')::numeric,(p_args->>'p_total')::numeric,
      p_args->'p_legs',(p_args->>'p_promo_code_id')::uuid,(p_args->>'p_discount_amount')::numeric,
      p_args->>'p_payment_method',(p_args->>'p_handling_fee')::numeric) t;
  else raise exception 'Invalid checkout kind'; end if;
  update checkout_attempts set result=v_result where customer_id=p_customer_id and attempt_id=p_attempt_id;
  return jsonb_build_object('result',v_result,'replayed',false);
end $$;
-- One provider order per payable order/trip. Never steal a creation claim:
-- a crash after the provider accepted a request is an uncertain outcome.
create table public.checkout_payment_sessions (
  kind text not null check(kind in ('order','trip')),
  target_id uuid not null,
  customer_id uuid not null references public.users(id),
  provider_order_id text unique,
  upi_state text check(upi_state in ('creating','ready')),
  upi_payment_id text,
  upi_link text,
  reconcile_after timestamptz not null default '-infinity',
  reconcile_state text not null default 'reconciling',
  created_at timestamptz not null default now(),
  primary key(kind,target_id)
);
alter table public.checkout_payment_sessions enable row level security;
create function public.claim_checkout_payment(p_customer_id uuid,p_kind text,p_target_id uuid,p_mode text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb; s checkout_payment_sessions; claimed boolean:=false; online boolean;
begin
  if p_kind='order' then
    select to_jsonb(o) into r from orders o where id=p_target_id for update;
    online:=r->>'payment_method'='online' and r->>'trip_id' is null;
  elsif p_kind='trip' then
    select to_jsonb(t) into r from trips t where id=p_target_id for update;
    online:=exists(select 1 from orders where trip_id=p_target_id and payment_method='online')
      and not exists(select 1 from orders where trip_id=p_target_id and status in ('cancelled','failed'));
  else raise exception 'Invalid kind'; end if;
  if r is null or r->>'customer_id'<>p_customer_id::text then raise exception 'Not your checkout' using errcode='P0403'; end if;
  if not coalesce(online,false) or r->>'status'<>'placed' or r->>'razorpay_payment_id' is not null
    or coalesce((r->>'placed_at')::timestamptz,(r->>'created_at')::timestamptz)+interval '20 minutes'<=now()
    then raise exception 'Checkout is not payable' using errcode='P0410'; end if;
  if p_mode='order' then
    insert into checkout_payment_sessions(kind,target_id,customer_id) values(p_kind,p_target_id,p_customer_id)
      on conflict do nothing;
    claimed:=found;
  elsif p_mode<>'upi' then raise exception 'Invalid payment mode'; end if;
  select * into s from checkout_payment_sessions where kind=p_kind and target_id=p_target_id for update;
  if s.target_id is null then raise exception 'Provider order not ready'; end if;
  if p_mode='upi' and s.provider_order_id is not null and s.upi_state is null then
    update checkout_payment_sessions set upi_state='creating' where kind=p_kind and target_id=p_target_id returning * into s;
    claimed:=true;
  end if;
  return jsonb_build_object('session',to_jsonb(s),'claimed',claimed,'total',(r->>'total')::numeric);
end $$;
revoke all on table public.checkout_attempts,public.checkout_payment_sessions from public,anon,authenticated;
grant all on table public.checkout_attempts,public.checkout_payment_sessions to service_role;
revoke all on function public.create_checkout_attempt(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.claim_checkout_payment(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.create_checkout_attempt(uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.claim_checkout_payment(uuid,text,uuid,text) to service_role;

-- Closing an uncertain attempt competes on the same unique row as creation.
-- If creation already committed, return it; otherwise fence future retries.
create function public.close_checkout_attempt(p_customer_id uuid,p_attempt_id uuid,p_fingerprint text,p_kind text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a checkout_attempts;
begin
 insert into checkout_attempts(customer_id,attempt_id,fingerprint,kind,abandoned)
 values(p_customer_id,p_attempt_id,p_fingerprint,p_kind,true) on conflict do nothing;
 select * into a from checkout_attempts where customer_id=p_customer_id and attempt_id=p_attempt_id for update;
 if a.fingerprint<>p_fingerprint or a.kind<>p_kind then raise exception 'Attempt conflict' using errcode='P0409'; end if;
 if a.result is null then update checkout_attempts set abandoned=true where customer_id=p_customer_id and attempt_id=p_attempt_id; end if;
 return jsonb_build_object('result',a.result,'kind',a.kind);
end $$;
revoke all on function public.close_checkout_attempt(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.close_checkout_attempt(uuid,uuid,text,text) to service_role;
create index orders_pending_checkout_idx on public.orders(customer_id,placed_at desc)
 where status='placed' and payment_method='online' and razorpay_payment_id is null;

-- Coalesce status polling across devices/replicas. Retry launch checks
-- still contact the provider afresh before returning a payable order.
create function public.claim_payment_reconciliation(p_kind text,p_target_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s checkout_payment_sessions;
begin
 update checkout_payment_sessions set reconcile_after=now()+interval '10 seconds',reconcile_state='reconciling'
 where kind=p_kind and target_id=p_target_id and reconcile_after<=now() returning * into s;
 if found then return jsonb_build_object('claimed',true); end if;
 select * into s from checkout_payment_sessions where kind=p_kind and target_id=p_target_id;
 return jsonb_build_object('claimed',false,'state',coalesce(s.reconcile_state,'reconciling'));
end $$;
revoke all on function public.claim_payment_reconciliation(text,uuid) from public,anon,authenticated;
grant execute on function public.claim_payment_reconciliation(text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
