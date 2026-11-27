-- Cashfree as a second payment gateway beside Razorpay (backend/PAYMENTS.md,
-- backend/src/payments/gateway.ts). WRITTEN, NOT APPLIED: apply only after
-- review. Business rules are unchanged; every function below is the
-- 20261013105118 definition with 'razorpay'-only checks widened to
-- ('razorpay','cashfree') and per-provider id formats:
--   razorpay order ^order_..., payment ^pay_...
--   cashfree order ^gl_<32 hex> (our deterministic id), payment numeric cf_payment_id
-- Plus: the first claim picks the gateway, a one-time Cashfree->Razorpay
-- fallback before any provider order is attached, and the admin
-- "Payment gateway" setting (razorpay | cashfree | split %).
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- Admin setting. Default razorpay: nothing changes until the admin picks.
ALTER TABLE public.platform_settings
 ADD COLUMN IF NOT EXISTS payment_gateway text NOT NULL DEFAULT 'razorpay',
 ADD COLUMN IF NOT EXISTS payment_gateway_split_pct integer NOT NULL DEFAULT 0;
ALTER TABLE public.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_payment_gateway_check;
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_payment_gateway_check
 CHECK (payment_gateway IN ('razorpay','cashfree','split') AND payment_gateway_split_pct BETWEEN 0 AND 100);

-- Which provider a checkout fell back from (reporting + "only once").
ALTER TABLE public.checkout_payment_sessions ADD COLUMN IF NOT EXISTS fallback_from text
 CHECK (fallback_from IS NULL OR fallback_from IN ('razorpay','cashfree'));

-- Incidents can now belong to either provider.
ALTER TABLE public.checkout_payment_incidents DROP CONSTRAINT IF EXISTS checkout_payment_incidents_payment_provider_check;
ALTER TABLE public.checkout_payment_incidents ADD CONSTRAINT checkout_payment_incidents_payment_provider_check
 CHECK (payment_provider IN ('razorpay','cashfree'));

CREATE OR REPLACE FUNCTION public.claim_checkout_payment(p_customer_id uuid, p_kind text, p_target_id uuid, p_mode text, p_provider text DEFAULT 'razorpay')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb; s checkout_payment_sessions; claimed boolean:=false; online boolean;
begin
  if p_provider IS NULL OR p_provider NOT IN ('razorpay','cashfree') then raise exception 'Unsupported payment provider'; end if;
  if p_kind='order' then
    select to_jsonb(o) into r from orders o where id=p_target_id for update;
    online:=r->>'payment_method'='online' and r->>'trip_id' is null;
  elsif p_kind='trip' then
    select to_jsonb(t) into r from trips t where id=p_target_id for update;
    online:=exists(select 1 from orders where trip_id=p_target_id and payment_method='online')
      and not exists(select 1 from orders where trip_id=p_target_id and status in ('cancelled','failed'));
  else raise exception 'Invalid kind'; end if;
  if r is null or r->>'customer_id'<>p_customer_id::text then raise exception 'Not your checkout' using errcode='P0403'; end if;
  -- The first claim picks the gateway (backend gateway.ts). Once a session
  -- exists the provider is fixed; only switch_checkout_provider changes it.
  if p_mode='order' and r->>'payment_provider' IS DISTINCT FROM p_provider and r->>'provider_payment_id' is null
    and r->>'payment_provider' in ('razorpay','cashfree')
    and not exists(select 1 from checkout_payment_sessions where kind=p_kind and target_id=p_target_id) then
    if p_kind='order' then
      update orders set payment_provider=p_provider where id=p_target_id;
      select to_jsonb(o) into r from orders o where id=p_target_id;
    else
      update trips set payment_provider=p_provider where id=p_target_id;
      update orders set payment_provider=p_provider where trip_id=p_target_id;
      select to_jsonb(t) into r from trips t where id=p_target_id;
    end if;
  end if;
  if r->>'payment_provider' IS DISTINCT FROM p_provider then raise exception 'Legacy checkout requires support' using errcode='P0410'; end if;
  if not coalesce(online,false) or r->>'status'<>'placed' or r->>'provider_payment_id' is not null
    or (r->>'reservation_expires_at')::timestamptz<=checkout_clock()
    then raise exception 'Checkout is not payable' using errcode='P0410'; end if;
  if p_mode='order' then
    insert into checkout_payment_sessions(kind,target_id,customer_id,payment_provider) values(p_kind,p_target_id,p_customer_id,p_provider)
      on conflict do nothing;
    claimed:=found;
  elsif p_mode<>'upi' then raise exception 'Invalid payment mode'; end if;
  select * into s from checkout_payment_sessions where kind=p_kind and target_id=p_target_id for update;
  if s.target_id is null then raise exception 'Provider order not ready'; end if;
  if s.payment_provider IS DISTINCT FROM p_provider then raise exception 'Checkout is not payable' using errcode='P0410'; end if;
  -- The initial insert permanently claims external order creation. Unknown
  -- outcomes must recover by receipt, never repeat an unproven POST.
  return jsonb_build_object('session',to_jsonb(s),'claimed',claimed,'total',(r->>'total')::numeric);
end $function$
;

CREATE OR REPLACE FUNCTION public.attach_checkout_provider_order(p_kind text,p_target_id uuid,p_provider_order_id text,p_expected_paise bigint,p_provider text DEFAULT 'razorpay')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE r jsonb; s checkout_payment_sessions;
BEGIN
 IF p_provider_order_id IS NULL OR NOT ((p_provider='razorpay' AND p_provider_order_id ~ '^order_[A-Za-z0-9]+$')
   OR (p_provider='cashfree' AND p_provider_order_id ~ '^gl_[0-9a-f]{32}$')) THEN RAISE EXCEPTION 'Invalid provider order'; END IF;
 IF p_kind='order' THEN SELECT to_jsonb(o) INTO r FROM orders o WHERE id=p_target_id AND trip_id IS NULL FOR UPDATE;
 ELSIF p_kind='trip' THEN SELECT to_jsonb(t) INTO r FROM trips t WHERE id=p_target_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'Invalid kind'; END IF;
 IF r IS NULL OR r->>'payment_provider' IS DISTINCT FROM p_provider OR p_expected_paise IS NULL OR p_expected_paise<>round((r->>'total')::numeric*100)::bigint THEN RAISE EXCEPTION 'Provider order target mismatch'; END IF;
 SELECT * INTO s FROM checkout_payment_sessions WHERE kind=p_kind AND target_id=p_target_id FOR UPDATE;
 IF NOT FOUND OR s.payment_provider IS DISTINCT FROM p_provider OR s.customer_id::text IS DISTINCT FROM r->>'customer_id' THEN RAISE EXCEPTION 'Provider session mismatch'; END IF;
 IF s.provider_order_id IS NOT NULL AND s.provider_order_id<>p_provider_order_id THEN RAISE EXCEPTION 'Provider order conflict'; END IF;
 -- Attachment remains possible after local expiry: late webhooks must be
 -- associated with the original checkout so settlement creates a refund.
 UPDATE checkout_payment_sessions SET provider_order_id=p_provider_order_id WHERE kind=p_kind AND target_id=p_target_id RETURNING * INTO s;
 IF p_kind='trip' THEN UPDATE trips SET provider_order_id=p_provider_order_id WHERE id=p_target_id; END IF;
 RETURN to_jsonb(s);
END $function$;

CREATE OR REPLACE FUNCTION public.settle_checkout_payment(p_order_id uuid, p_trip_id uuid, p_payment_id text, p_expected_paise bigint, p_currency text, p_provider_order_id text, p_provider text DEFAULT 'razorpay')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE o public.orders; t public.trips; rejected boolean; old_payment text; session_ checkout_payment_sessions;
BEGIN
  IF (p_order_id IS NULL)=(p_trip_id IS NULL) OR nullif(p_payment_id,'') IS NULL THEN RAISE EXCEPTION 'Invalid payment target'; END IF;
  IF NOT ((p_provider='razorpay' AND p_payment_id ~ '^pay_[A-Za-z0-9]+$') OR (p_provider='cashfree' AND p_payment_id ~ '^[0-9]{1,30}$')) OR p_expected_paise IS NULL OR p_currency IS NULL OR p_provider_order_id IS NULL THEN RAISE EXCEPTION 'Verified capture details required'; END IF;
  IF upper(p_currency)<>'INR' THEN RAISE EXCEPTION 'settle_checkout_payment currency % not supported', p_currency; END IF;
  IF p_trip_id IS NOT NULL THEN
    SELECT * INTO t FROM public.trips WHERE id=p_trip_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
    -- Captured amount must equal the trip's own total. Checked before any
    -- idempotent early-return so a replay with a wrong amount is rejected too.
    IF p_expected_paise IS NOT NULL AND p_expected_paise<>round(t.total*100)::bigint THEN
      RAISE EXCEPTION 'settle_checkout_payment amount mismatch: captured % paise <> trip total % paise', p_expected_paise, round(t.total*100)::bigint;
    END IF;
    SELECT * INTO session_ FROM checkout_payment_sessions WHERE kind='trip' AND target_id=t.id FOR UPDATE;
    IF NOT FOUND OR session_.payment_provider IS DISTINCT FROM p_provider OR t.payment_provider IS DISTINCT FROM p_provider OR session_.provider_order_id IS DISTINCT FROM p_provider_order_id OR session_.customer_id IS DISTINCT FROM t.customer_id THEN RAISE EXCEPTION 'Capture provider/order mismatch'; END IF;
    old_payment:=t.provider_payment_id;
    IF old_payment IS NOT NULL THEN
      IF old_payment<>p_payment_id THEN RAISE EXCEPTION 'Payment conflict'; END IF;
      RETURN jsonb_build_object('accepted',NOT t.checkout_payment_rejected,'total',t.total,'settled_now',false);
    END IF;
    PERFORM 1 FROM public.orders WHERE trip_id=t.id ORDER BY id FOR UPDATE;
    IF EXISTS(SELECT 1 FROM public.orders WHERE trip_id=t.id AND payment_method='cod') THEN
      -- Switched to cash on delivery: refund the late capture in full.
      SELECT payment_id INTO old_payment FROM public.trip_refunds WHERE trip_id=t.id;
      IF FOUND THEN
        IF old_payment<>p_payment_id THEN RAISE EXCEPTION 'Payment conflict'; END IF;
        RETURN jsonb_build_object('accepted',false,'total',t.total,'settled_now',false);
      END IF;
      INSERT INTO public.trip_refunds(trip_id,payment_id,target_paise) VALUES(t.id,p_payment_id,round(t.total*100)::bigint);
      RETURN jsonb_build_object('accepted',false,'total',t.total,'settled_now',true);
    END IF;
    rejected:=t.status='cancelled' OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id=t.id AND
      (status='cancelled' OR (payment_method='online' AND provider_payment_id IS NULL AND reservation_expires_at<=checkout_clock())));
    IF rejected THEN
      PERFORM 1 FROM public.products WHERE id IN(SELECT product_id FROM inventory_reservations WHERE order_id IN(SELECT id FROM public.orders WHERE trip_id=t.id) AND state IN ('held','committed')) ORDER BY id FOR UPDATE;
      UPDATE public.orders SET status='cancelled',cancel_reason='Payment arrived after checkout closed.' WHERE trip_id=t.id AND status IN ('placed','packed');
    END IF;
    UPDATE public.trips SET provider_payment_id=p_payment_id,checkout_payment_rejected=rejected,
      status=CASE WHEN rejected THEN 'cancelled' ELSE status END WHERE id=t.id;
    UPDATE public.orders SET provider_payment_id=p_payment_id,checkout_payment_rejected=rejected WHERE trip_id=t.id;
    RETURN jsonb_build_object('accepted',NOT rejected,'total',t.total,'settled_now',true);
  ELSE
    SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
    IF NOT FOUND OR o.trip_id IS NOT NULL THEN RAISE EXCEPTION 'Use the trip payment target'; END IF;
    IF p_expected_paise IS NOT NULL AND p_expected_paise<>round(o.total*100)::bigint THEN
      RAISE EXCEPTION 'settle_checkout_payment amount mismatch: captured % paise <> order total % paise', p_expected_paise, round(o.total*100)::bigint;
    END IF;
    SELECT * INTO session_ FROM checkout_payment_sessions WHERE kind='order' AND target_id=o.id FOR UPDATE;
    IF NOT FOUND OR session_.payment_provider IS DISTINCT FROM p_provider OR o.payment_provider IS DISTINCT FROM p_provider OR session_.provider_order_id IS DISTINCT FROM p_provider_order_id OR session_.customer_id IS DISTINCT FROM o.customer_id THEN RAISE EXCEPTION 'Capture provider/order mismatch'; END IF;
    IF o.provider_payment_id IS NOT NULL THEN
      IF o.provider_payment_id<>p_payment_id THEN RAISE EXCEPTION 'Payment conflict'; END IF;
      RETURN jsonb_build_object('accepted',NOT o.checkout_payment_rejected,'total',o.total,'settled_now',false);
    END IF;
    IF o.payment_method='cod' THEN
      -- Never write provider_payment_id onto a COD order: everything
      -- downstream reads it as "paid online". The refund job alone records it.
      SELECT payment_id INTO old_payment FROM public.order_refund_jobs WHERE order_id=o.id;
      IF FOUND THEN
        IF old_payment<>p_payment_id THEN RAISE EXCEPTION 'Payment conflict'; END IF;
        RETURN jsonb_build_object('accepted',false,'total',o.total,'settled_now',false);
      END IF;
      INSERT INTO public.order_refund_jobs(order_id,payment_id,target_paise) VALUES(o.id,p_payment_id,round(o.total*100)::bigint);
      UPDATE public.orders SET refund_status='processing' WHERE id=o.id AND refund_status='none';
      RETURN jsonb_build_object('accepted',false,'total',o.total,'settled_now',true);
    END IF;
    rejected:=o.status='cancelled' OR (o.payment_method='online' AND o.reservation_expires_at<=checkout_clock());
    IF rejected AND o.status IN ('placed','packed') THEN
      UPDATE public.orders SET status='cancelled',cancel_reason='Payment arrived after checkout closed.' WHERE id=o.id;
    END IF;
    -- 080's BEFORE UPDATE trigger queues the refund when rejected.
    UPDATE public.orders SET provider_payment_id=p_payment_id,checkout_payment_rejected=rejected WHERE id=o.id;
    RETURN jsonb_build_object('accepted',NOT rejected,'total',o.total,'settled_now',true);
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.approve_failed_trip_refund(p_trip uuid, p_amount_paise bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE t trips;
BEGIN
 SELECT * INTO t FROM trips WHERE id=p_trip FOR UPDATE;
 IF NOT FOUND OR t.status<>'failed' OR t.provider_payment_id IS NULL OR p_amount_paise NOT BETWEEN 1 AND round(t.total*100)::bigint THEN RAISE EXCEPTION 'Invalid failed-trip refund'; END IF;
 IF EXISTS(SELECT 1 FROM trip_refunds WHERE trip_id=p_trip AND target_paise<>p_amount_paise) THEN RAISE EXCEPTION 'Refund amount already frozen'; END IF;
 INSERT INTO trip_refunds(trip_id,payment_id,target_paise,status) VALUES(t.id,t.provider_payment_id,p_amount_paise,
  CASE WHEN t.payment_provider NOT IN ('razorpay','cashfree') THEN 'manual_required' ELSE 'queued' END) ON CONFLICT(trip_id) DO NOTHING;
 UPDATE orders SET refund_status=CASE WHEN t.payment_provider NOT IN ('razorpay','cashfree') THEN 'manual_required' ELSE 'processing' END
  WHERE trip_id=p_trip AND refund_status='none';
END $function$
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
  -- Historical unsupported providers require a manual refund.
  insert into trip_refunds(trip_id,payment_id,target_paise,status)
  values(t.id,t.provider_payment_id,round(t.total*100)::bigint,
   case when t.payment_provider NOT IN ('razorpay','cashfree') then 'manual_required' else 'queued' end) on conflict(trip_id) do nothing;
  -- Legs carry the admin/customer-visible status (save_trip_refund keeps it in
  -- sync); mark_order_refund_manual completes manual_required legs.
  perform 1 from orders where trip_id=t.id order by id for update;
  if t.payment_provider NOT IN ('razorpay','cashfree') or exists(select 1 from trip_refunds where trip_id=t.id and status='manual_required') then
   update orders set refund_status='manual_required' where trip_id=t.id and refund_status in ('none','processing','failed');
  else
   update orders set refund_status='processing' where trip_id=t.id and refund_status='none';
  end if;
 end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.queue_cancelled_order_refund()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NEW.trip_id IS NULL AND (NEW.status='cancelled' OR (NEW.status='failed' AND NEW.payment_method='online'))
  AND NEW.provider_payment_id IS NOT NULL AND NEW.total>0 THEN
  IF NOT EXISTS(SELECT 1 FROM order_refund_jobs WHERE order_id=NEW.id) THEN
  INSERT INTO order_refund_jobs(order_id,payment_id,target_paise,provider_refund_id,status)
  VALUES(NEW.id,NEW.provider_payment_id,round(NEW.total*100)::bigint,NEW.provider_refund_id,
   CASE WHEN NEW.refund_status='completed' THEN 'completed' WHEN NEW.payment_provider NOT IN ('razorpay','cashfree') THEN 'manual_required' ELSE 'queued' END) ON CONFLICT(order_id) DO NOTHING;
  END IF;
  IF NEW.refund_status='none' THEN NEW.refund_status:=CASE WHEN NEW.payment_provider NOT IN ('razorpay','cashfree') THEN 'manual_required' ELSE 'processing' END; END IF;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.request_order_refund(p_order uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE o orders;
BEGIN
 SELECT * INTO o FROM orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR o.trip_id IS NOT NULL OR o.status NOT IN('failed','cancelled') OR o.provider_payment_id IS NULL OR o.total<=0 THEN
  RAISE EXCEPTION 'Order is not eligible for a single-order refund'; END IF;
 INSERT INTO order_refund_jobs(order_id,payment_id,target_paise,provider_refund_id,status)
 VALUES(o.id,o.provider_payment_id,round(o.total*100)::bigint,o.provider_refund_id,
 CASE WHEN o.refund_status='completed' THEN 'completed' WHEN o.payment_provider NOT IN ('razorpay','cashfree') THEN 'manual_required' ELSE 'queued' END) ON CONFLICT(order_id) DO NOTHING;
 PERFORM retry_order_refund(o.id);
 UPDATE orders SET refund_status=CASE WHEN o.payment_provider NOT IN ('razorpay','cashfree') OR EXISTS(SELECT 1 FROM order_refund_jobs WHERE order_id=o.id AND status='manual_required') THEN 'manual_required' ELSE 'processing' END
  WHERE id=o.id AND refund_status<>'completed';
END $function$
;

CREATE OR REPLACE FUNCTION public.retry_order_refund(p_order uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j order_refund_jobs;
BEGIN
 -- Same lock order as settlement and cancellation: order, then refund job.
 PERFORM 1 FROM orders WHERE id=p_order FOR UPDATE;
 SELECT * INTO j FROM order_refund_jobs WHERE order_id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No durable refund intent'; END IF;
 IF j.status='failed' AND EXISTS(SELECT 1 FROM orders WHERE id=p_order AND payment_provider NOT IN ('razorpay','cashfree')) THEN
  -- Historical unsupported providers require a manual refund.
  UPDATE order_refund_jobs SET status='manual_required',lease_token=null,lease_until=null,updated_at=now() WHERE id=j.id;
  UPDATE orders SET refund_status='manual_required' WHERE id=p_order AND refund_status<>'completed';
 ELSIF j.status='failed' THEN
  -- Only a confirmed failed provider refund is a new financial operation.
  -- Unknown outcomes keep the original key/body and are reconciled by worker.
  UPDATE order_refund_jobs SET status='queued',next_attempt_at=now(),last_error=null,
   request_key=CASE WHEN last_error='Provider refund failed' THEN gen_random_uuid() ELSE request_key END,
   request_paise=CASE WHEN last_error='Provider refund failed' THEN null ELSE request_paise END,
   provider_refund_id=CASE WHEN last_error='Provider refund failed' THEN null ELSE provider_refund_id END
  WHERE id=j.id;
  UPDATE orders SET refund_status='processing',provider_refund_id=CASE WHEN j.last_error='Provider refund failed' THEN null ELSE provider_refund_id END WHERE id=p_order AND refund_status<>'completed';
 END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.save_order_refund(p_id uuid, p_lease uuid, p_patch jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j order_refund_jobs; target uuid;
BEGIN
 SELECT order_id INTO target FROM order_refund_jobs WHERE id=p_id;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM orders WHERE id=target FOR UPDATE;
 SELECT * INTO j FROM order_refund_jobs WHERE id=p_id AND lease_token=p_lease FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF j.request_paise IS NOT NULL AND p_patch ? 'request_paise' AND (p_patch->>'request_paise')::bigint IS DISTINCT FROM j.request_paise THEN
  RAISE EXCEPTION 'Frozen refund amount cannot change'; END IF;
 UPDATE order_refund_jobs SET
 request_paise=coalesce((p_patch->>'request_paise')::bigint,request_paise),
 provider_refund_id=coalesce(p_patch->>'provider_refund_id',provider_refund_id),
 status=coalesce(p_patch->>'status',status),last_error=p_patch->>'last_error',
 next_attempt_at=coalesce((p_patch->>'next_attempt_at')::timestamptz,next_attempt_at),
 lease_token=CASE WHEN (p_patch->>'release')::boolean THEN null ELSE lease_token END,
 lease_until=CASE WHEN (p_patch->>'release')::boolean THEN null ELSE lease_until END,updated_at=now()
 WHERE id=j.id RETURNING * INTO j;
 IF j.status IN('processing','completed','failed','manual_required') THEN
  UPDATE orders SET refund_status=j.status,provider_refund_id=j.provider_refund_id,
    refunded_at=CASE WHEN j.status='completed' THEN coalesce(refunded_at,now()) ELSE refunded_at END
  WHERE id=j.order_id AND refund_status<>'completed';
 END IF;
 RETURN true;
END $function$
;

CREATE OR REPLACE FUNCTION public.claim_checkout_expiry_reconciliation(p_limit integer DEFAULT 25)
 RETURNS TABLE(kind text, target_id uuid, provider_order_id text, total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE  singles uuid[]; trip_ids uuid[];
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Batch limit must be 1–100'; END IF;
 SELECT coalesce(array_agg(q.target_id),'{}') INTO singles FROM (
  SELECT s.target_id FROM orders o JOIN checkout_payment_sessions s ON s.kind='order' AND s.target_id=o.id
  WHERE o.trip_id IS NULL AND o.status='placed' AND o.payment_method='online' AND o.provider_payment_id IS NULL
   AND o.reservation_expires_at<=checkout_clock() AND s.provider_order_id IS NOT NULL AND s.payment_provider IN ('razorpay','cashfree') AND s.expiry_checked_at IS NULL AND s.expiry_lease_until<now()
  ORDER BY o.placed_at,o.id LIMIT p_limit FOR UPDATE OF s SKIP LOCKED
 ) q;
 SELECT coalesce(array_agg(q.target_id),'{}') INTO trip_ids FROM (
  SELECT s.target_id FROM trips tr JOIN checkout_payment_sessions s ON s.kind='trip' AND s.target_id=tr.id
  WHERE tr.status='placed' AND tr.provider_payment_id IS NULL
   AND EXISTS(SELECT 1 FROM orders c WHERE c.trip_id=tr.id AND c.payment_method='online' AND c.reservation_expires_at<=checkout_clock())
   AND s.provider_order_id IS NOT NULL AND s.payment_provider IN ('razorpay','cashfree') AND s.expiry_checked_at IS NULL AND s.expiry_lease_until<now()
  ORDER BY tr.created_at,tr.id LIMIT p_limit FOR UPDATE OF s SKIP LOCKED
 ) q;
 UPDATE checkout_payment_sessions s SET expiry_lease_until=now()+interval '2 minutes'
 WHERE (s.kind='order' AND s.target_id=ANY(singles)) OR (s.kind='trip' AND s.target_id=ANY(trip_ids));
 RETURN QUERY SELECT s.kind,s.target_id,s.provider_order_id,coalesce(o.total,tr.total)
 FROM checkout_payment_sessions s
 LEFT JOIN orders o ON s.kind='order' AND o.id=s.target_id
 LEFT JOIN trips tr ON s.kind='trip' AND tr.id=s.target_id
 WHERE (s.kind='order' AND s.target_id=ANY(singles)) OR (s.kind='trip' AND s.target_id=ANY(trip_ids));
END $function$
;


CREATE OR REPLACE FUNCTION public.record_checkout_payment_incident(p_kind text,p_target_id uuid,p_provider_order_id text,p_payment_id text,p_amount_paise bigint,p_currency text,p_reason text DEFAULT 'extra_capture')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE target jsonb; session_ checkout_payment_sessions; incident uuid; provider_ text;
BEGIN
 IF p_kind='order' THEN SELECT to_jsonb(o) INTO target FROM orders o WHERE id=p_target_id AND trip_id IS NULL FOR UPDATE;
 ELSIF p_kind='trip' THEN SELECT to_jsonb(t) INTO target FROM trips t WHERE id=p_target_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'Invalid kind'; END IF;
 provider_:=target->>'payment_provider';
 IF target IS NULL OR provider_ IS NULL OR provider_ NOT IN ('razorpay','cashfree') THEN RAISE EXCEPTION 'Invalid incident target'; END IF;
 SELECT * INTO session_ FROM checkout_payment_sessions WHERE kind=p_kind AND target_id=p_target_id FOR UPDATE;
 IF NOT FOUND OR session_.payment_provider IS DISTINCT FROM provider_ OR session_.provider_order_id IS DISTINCT FROM p_provider_order_id THEN RAISE EXCEPTION 'Incident provider order mismatch'; END IF;
 IF p_payment_id IS NULL OR NOT ((provider_='razorpay' AND p_payment_id ~ '^pay_[A-Za-z0-9]+$') OR (provider_='cashfree' AND p_payment_id ~ '^[0-9]{1,30}$')) OR p_amount_paise IS NULL OR p_amount_paise<=0 OR p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$' OR p_reason NOT IN('extra_capture','capture_conflict','amount_mismatch') THEN RAISE EXCEPTION 'Invalid capture incident'; END IF;
 INSERT INTO checkout_payment_incidents(payment_provider,kind,target_id,provider_order_id,payment_id,canonical_payment_id,amount_paise,currency,reason)
 VALUES(provider_,p_kind,p_target_id,p_provider_order_id,p_payment_id,target->>'provider_payment_id',p_amount_paise,p_currency,p_reason)
 ON CONFLICT(payment_provider,payment_id,reason,kind,target_id) DO NOTHING RETURNING id INTO incident;
 IF incident IS NULL THEN
  SELECT id INTO incident FROM checkout_payment_incidents WHERE payment_provider=provider_ AND payment_id=p_payment_id AND reason=p_reason AND kind=p_kind AND target_id=p_target_id;
 END IF;
 RETURN incident;
END $function$;

-- One-time fallback: only before any provider order is attached (so the app
-- never held anything payable on the old provider) and never twice.
CREATE OR REPLACE FUNCTION public.switch_checkout_provider(p_kind text,p_target_id uuid,p_from text,p_to text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE r jsonb; s checkout_payment_sessions;
BEGIN
 IF p_from NOT IN ('razorpay','cashfree') OR p_to NOT IN ('razorpay','cashfree') OR p_from=p_to THEN RAISE EXCEPTION 'Invalid provider switch'; END IF;
 IF p_kind='order' THEN SELECT to_jsonb(o) INTO r FROM orders o WHERE id=p_target_id AND trip_id IS NULL FOR UPDATE;
 ELSIF p_kind='trip' THEN SELECT to_jsonb(t) INTO r FROM trips t WHERE id=p_target_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'Invalid kind'; END IF;
 IF r IS NULL OR r->>'payment_provider' IS DISTINCT FROM p_from OR r->>'provider_payment_id' IS NOT NULL OR r->>'status'<>'placed' THEN RAISE EXCEPTION 'Checkout cannot switch provider'; END IF;
 SELECT * INTO s FROM checkout_payment_sessions WHERE kind=p_kind AND target_id=p_target_id FOR UPDATE;
 IF NOT FOUND OR s.payment_provider IS DISTINCT FROM p_from OR s.provider_order_id IS NOT NULL OR s.fallback_from IS NOT NULL THEN RAISE EXCEPTION 'Checkout cannot switch provider'; END IF;
 UPDATE checkout_payment_sessions SET payment_provider=p_to,fallback_from=p_from WHERE kind=p_kind AND target_id=p_target_id RETURNING * INTO s;
 IF p_kind='order' THEN UPDATE orders SET payment_provider=p_to WHERE id=p_target_id;
 ELSE UPDATE trips SET payment_provider=p_to WHERE id=p_target_id; UPDATE orders SET payment_provider=p_to WHERE trip_id=p_target_id; END IF;
 RETURN to_jsonb(s);
END $function$;

REVOKE ALL ON FUNCTION public.claim_checkout_payment(uuid,text,uuid,text,text),
 public.attach_checkout_provider_order(text,uuid,text,bigint,text),
 public.settle_checkout_payment(uuid,uuid,text,bigint,text,text,text),
 public.record_checkout_payment_incident(text,uuid,text,text,bigint,text,text),
 public.switch_checkout_provider(text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout_payment(uuid,text,uuid,text,text),
 public.attach_checkout_provider_order(text,uuid,text,bigint,text),
 public.settle_checkout_payment(uuid,uuid,text,bigint,text,text,text),
 public.record_checkout_payment_incident(text,uuid,text,text,bigint,text,text),
 public.switch_checkout_provider(text,uuid,text,text) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
