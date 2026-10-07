-- Payment and refund recovery fixes. Requires 001..104.
-- 1. UPI claim release: checkout_payment_sessions.upi_claimed_at records when
--    upi_state became 'creating'. claim_checkout_payment (body from 103) lets
--    a UPI caller reclaim a 'creating' state older than 2 minutes (past the
--    15s provider timeout); both UPI callers first confirm the provider shows
--    no live attempt (requirePaymentRetrySafe). A provider-rejected request is
--    released by the API itself (upi_state -> NULL). Before this, one failed
--    or timed-out UPI request locked UPI for the whole checkout.
-- 2. save_trip_refund: the trip refund worker's lease-guarded save (it wrote
--    trip_refunds directly). It also copies the outcome to the trip's leg
--    orders (refund_status, provider_refund_id, refunded_at), as
--    save_order_refund does for single orders; legs used to stay
--    'none'/'processing' forever (blocking review_customer_deletion).
--    Lock order matches cancellation/settlement/manual refunds:
--    trip -> legs by id -> refund row.
-- 3. enqueue_trip_refund (body from 103): Cashfree legs go 'none' ->
--    'processing' with the queued refund, like approve_failed_trip_refund.
-- 4. A Cashfree trip refund the provider definitively rejected now goes to
--    'manual_required' (worker), so the admin closes it with the existing
--    mark_order_refund_manual. Backfill: 'failed' trip refunds become
--    manual_required and every leg is synced to its trip refund's status.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.checkout_payment_sessions ADD COLUMN IF NOT EXISTS upi_claimed_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_checkout_payment(p_customer_id uuid, p_kind text, p_target_id uuid, p_mode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if not coalesce(online,false) or r->>'status'<>'placed' or r->>'provider_payment_id' is not null
    or coalesce((r->>'placed_at')::timestamptz,(r->>'created_at')::timestamptz)+interval '20 minutes'<=now()
    then raise exception 'Checkout is not payable' using errcode='P0410'; end if;
  if p_mode='order' then
    insert into checkout_payment_sessions(kind,target_id,customer_id) values(p_kind,p_target_id,p_customer_id)
      on conflict do nothing;
    claimed:=found;
  elsif p_mode<>'upi' then raise exception 'Invalid payment mode'; end if;
  select * into s from checkout_payment_sessions where kind=p_kind and target_id=p_target_id for update;
  if s.target_id is null then raise exception 'Provider order not ready'; end if;
  if s.payment_provider<>'cashfree' then raise exception 'Checkout is not payable' using errcode='P0410'; end if;
  -- A stale 'creating' claim (crash/timeout) is reclaimable: UPI callers
  -- verify the provider has no live attempt before claiming.
  if p_mode='upi' and s.provider_order_id is not null and (s.upi_state is null
    or (s.upi_state='creating' and coalesce(s.upi_claimed_at,'-infinity')<=now()-interval '2 minutes')) then
    update checkout_payment_sessions set upi_state='creating',upi_claimed_at=now(),upi_link=null,upi_payment_id=null
      where kind=p_kind and target_id=p_target_id returning * into s;
    claimed:=true;
  end if;
  return jsonb_build_object('session',to_jsonb(s),'claimed',claimed,'total',(r->>'total')::numeric);
end $function$
;

CREATE OR REPLACE FUNCTION public.enqueue_trip_refund(p_trip_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t public.trips;
begin
 select * into t from trips where id=p_trip_id for update;
 if t.status='cancelled' and t.provider_payment_id is not null and t.total>0 then
  -- Legacy (pre-Cashfree) captures are never sent to Cashfree: admin refunds by hand.
  insert into trip_refunds(trip_id,payment_id,target_paise,status)
  values(t.id,t.provider_payment_id,round(t.total*100)::bigint,
   case when t.payment_provider='razorpay' then 'manual_required' else 'queued' end) on conflict(trip_id) do nothing;
  -- Legs carry the admin/customer-visible status (save_trip_refund keeps it in
  -- sync); mark_order_refund_manual completes manual_required legs.
  perform 1 from orders where trip_id=t.id order by id for update;
  if t.payment_provider='razorpay' then
   update orders set refund_status='manual_required' where trip_id=t.id and refund_status in ('none','processing','failed');
  else
   update orders set refund_status='processing' where trip_id=t.id and refund_status='none';
  end if;
 end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.save_trip_refund(p_id uuid, p_lease uuid, p_patch jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j trip_refunds; trip uuid;
BEGIN
 SELECT trip_id INTO trip FROM trip_refunds WHERE id=p_id;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM trips WHERE id=trip FOR UPDATE;
 PERFORM 1 FROM orders WHERE trip_id=trip ORDER BY id FOR UPDATE;
 SELECT * INTO j FROM trip_refunds WHERE id=p_id AND lease_token=p_lease FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF j.request_paise IS NOT NULL AND p_patch ? 'request_paise' AND (p_patch->>'request_paise')::bigint IS DISTINCT FROM j.request_paise THEN
  RAISE EXCEPTION 'Frozen refund amount cannot change'; END IF;
 UPDATE trip_refunds SET
 request_paise=coalesce((p_patch->>'request_paise')::bigint,request_paise),
 provider_refund_id=coalesce(p_patch->>'provider_refund_id',provider_refund_id),
 refunded_paise=coalesce((p_patch->>'refunded_paise')::bigint,refunded_paise),
 status=coalesce(p_patch->>'status',status),
 last_error=CASE WHEN p_patch ? 'last_error' THEN p_patch->>'last_error' ELSE last_error END,
 next_attempt_at=coalesce((p_patch->>'next_attempt_at')::timestamptz,next_attempt_at),
 lease_token=CASE WHEN (p_patch->>'release')::boolean THEN null ELSE lease_token END,
 lease_until=CASE WHEN (p_patch->>'release')::boolean THEN null ELSE lease_until END,updated_at=now()
 WHERE id=j.id RETURNING * INTO j;
 IF j.status IN('processing','completed','failed','manual_required') THEN
  UPDATE orders SET refund_status=j.status,provider_refund_id=coalesce(j.provider_refund_id,provider_refund_id),
    refunded_at=CASE WHEN j.status='completed' THEN coalesce(refunded_at,now()) ELSE refunded_at END
  WHERE trip_id=j.trip_id AND refund_status<>'completed'
   AND (refund_status<>j.status OR provider_refund_id IS DISTINCT FROM coalesce(j.provider_refund_id,provider_refund_id));
 END IF;
 RETURN true;
END $function$
;

REVOKE ALL ON FUNCTION
 public.claim_checkout_payment(uuid,text,uuid,text),
 public.enqueue_trip_refund(uuid),
 public.save_trip_refund(uuid,uuid,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.claim_checkout_payment(uuid,text,uuid,text),
 public.enqueue_trip_refund(uuid),
 public.save_trip_refund(uuid,uuid,jsonb)
 TO service_role;

-- One-time backfill with user triggers off (as in 103): it must not bump
-- tracking revisions or write customer refund history.
ALTER TABLE public.orders DISABLE TRIGGER USER;
ALTER TABLE public.trip_refunds DISABLE TRIGGER USER;
UPDATE public.trip_refunds SET status='manual_required',lease_token=null,lease_until=null,
 last_error='Provider rejected the refund: refund manually',updated_at=now()
 WHERE status='failed';
UPDATE public.orders o SET refund_status=r.status,provider_refund_id=coalesce(r.provider_refund_id,o.provider_refund_id),
 refunded_at=CASE WHEN r.status='completed' THEN coalesce(o.refunded_at,r.updated_at) ELSE o.refunded_at END
 FROM public.trip_refunds r
 WHERE r.trip_id=o.trip_id AND r.status IN ('processing','completed','manual_required')
  AND o.refund_status<>'completed' AND o.refund_status<>r.status;
UPDATE public.orders o SET refund_status='processing' FROM public.trip_refunds r
 WHERE r.trip_id=o.trip_id AND r.status='queued' AND o.refund_status='none';
ALTER TABLE public.orders ENABLE TRIGGER USER;
ALTER TABLE public.trip_refunds ENABLE TRIGGER USER;

NOTIFY pgrst,'reload schema';
COMMIT;
