-- Cashfree replaces Razorpay (backend/PAYMENTS.md, "Database"). Requires 001..102.
-- Deploy together with the Cashfree API release: the old API reads razorpay_*.
-- 1. Rename provider columns (orders.razorpay_payment_id/_refund_id,
--    trips.razorpay_order_id/_payment_id -> provider_*). Indexes, trigger column
--    lists and table grants follow the rename; no index/constraint name
--    contains 'razorpay'.
-- 2. payment_provider ('cashfree'|'razorpay') on orders, trips and
--    checkout_payment_sessions; rows already carrying a provider payment/order
--    id are legacy Razorpay.
-- 3. Re-create every function whose body read razorpay_* (plpgsql bodies are
--    not rewritten by RENAME). Signatures, SECURITY DEFINER, search_path and
--    lock order are unchanged; no function had a p_razorpay_* parameter.
-- 4. Legacy Razorpay captures are never sent to Cashfree: their refunds get
--    status 'manual_required' (jobs and orders.refund_status) for the admin to
--    refund by hand (mark_order_refund_manual records it); the refund
--    claimers only take queued/processing rows.
--    Every refund row open at deploy time is a Razorpay refund and is flipped.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.orders RENAME COLUMN razorpay_payment_id TO provider_payment_id;
ALTER TABLE public.orders RENAME COLUMN razorpay_refund_id TO provider_refund_id;
ALTER TABLE public.trips RENAME COLUMN razorpay_order_id TO provider_order_id;
ALTER TABLE public.trips RENAME COLUMN razorpay_payment_id TO provider_payment_id;

ALTER TABLE public.orders ADD COLUMN payment_provider text NOT NULL DEFAULT 'cashfree'
 CONSTRAINT orders_payment_provider_check CHECK (payment_provider IN ('cashfree','razorpay'));
ALTER TABLE public.trips ADD COLUMN payment_provider text NOT NULL DEFAULT 'cashfree'
 CONSTRAINT trips_payment_provider_check CHECK (payment_provider IN ('cashfree','razorpay'));
ALTER TABLE public.checkout_payment_sessions ADD COLUMN payment_provider text NOT NULL DEFAULT 'cashfree'
 CONSTRAINT checkout_payment_sessions_payment_provider_check CHECK (payment_provider IN ('cashfree','razorpay'));

ALTER TABLE public.orders DROP CONSTRAINT orders_refund_status_check,
 ADD CONSTRAINT orders_refund_status_check CHECK (refund_status IN ('none','processing','completed','failed','manual_required'));
ALTER TABLE public.order_refund_jobs DROP CONSTRAINT order_refund_jobs_status_check,
 ADD CONSTRAINT order_refund_jobs_status_check CHECK (status IN ('queued','processing','completed','failed','manual_required'));
ALTER TABLE public.trip_refunds DROP CONSTRAINT trip_refunds_status_check,
 ADD CONSTRAINT trip_refunds_status_check CHECK (status IN ('queued','processing','completed','failed','manual_required'));

CREATE OR REPLACE FUNCTION public.abandon_unpaid_checkout(p_customer_id uuid, p_kind text, p_target_id uuid, p_action text, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE o public.orders; t public.trips; legs uuid[]; opened timestamptz;
BEGIN
 IF p_action NOT IN('cancel','cod') THEN RAISE EXCEPTION 'Invalid abandon action'; END IF;
 IF p_kind='trip' THEN
  SELECT * INTO t FROM public.trips WHERE id=p_target_id FOR UPDATE;
  IF NOT FOUND OR t.customer_id<>p_customer_id THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Checkout not found'; END IF;
  PERFORM 1 FROM public.orders WHERE trip_id=t.id ORDER BY id FOR UPDATE;
  SELECT array_agg(id ORDER BY id),min(placed_at) INTO legs,opened FROM public.orders WHERE trip_id=t.id;
  IF legs IS NULL OR t.status<>'placed' OR t.provider_payment_id IS NOT NULL OR t.checkout_payment_rejected
   OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id=t.id AND (status<>'placed' OR payment_method<>'online' OR provider_payment_id IS NOT NULL)) THEN
   RAISE EXCEPTION USING ERRCODE='P0410',MESSAGE='Checkout is no longer awaiting payment'; END IF;
 ELSIF p_kind='order' THEN
  SELECT * INTO o FROM public.orders WHERE id=p_target_id FOR UPDATE;
  IF NOT FOUND OR o.customer_id<>p_customer_id OR o.trip_id IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Checkout not found'; END IF;
  IF o.status<>'placed' OR o.payment_method<>'online' OR o.provider_payment_id IS NOT NULL OR o.checkout_payment_rejected THEN
   RAISE EXCEPTION USING ERRCODE='P0410',MESSAGE='Checkout is no longer awaiting payment'; END IF;
  legs:=ARRAY[o.id]; opened:=o.placed_at;
 ELSE RAISE EXCEPTION 'Invalid checkout kind'; END IF;

 IF p_action='cod' THEN
  -- Same payable window as claim_checkout_payment: past it the held stock
  -- belongs to the expiry worker, and the customer re-orders from the cart.
  IF opened+interval '20 minutes'<=checkout_clock() THEN
   RAISE EXCEPTION USING ERRCODE='P0411',MESSAGE='Checkout window closed'; END IF;
  -- claim_checkout_payment now refuses (payment_method<>'online'), so no new
  -- provider order/UPI intent can start; the expiry batch skips COD rows.
  UPDATE public.orders SET payment_method='cod' WHERE id=ANY(legs);
  UPDATE public.inventory_reservations SET state='committed',expires_at=null WHERE order_id=ANY(legs) AND state='held';
 ELSIF p_kind='trip' THEN
  PERFORM cancel_customer_trip(t.id,p_customer_id,p_reason);
 ELSE
  PERFORM 1 FROM public.products WHERE id IN(SELECT product_id FROM public.inventory_reservations
   WHERE order_id=o.id AND state IN('held','committed')) ORDER BY id FOR UPDATE;
  -- Triggers release stock (063) and the unpaid promo redemption (083).
  UPDATE public.orders SET status='cancelled',cancel_reason=p_reason WHERE id=o.id;
 END IF;
 RETURN jsonb_build_object('action',p_action,'kind',p_kind,'target_id',p_target_id);
END $function$
;

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
  CASE WHEN t.payment_provider='razorpay' THEN 'manual_required' ELSE 'queued' END) ON CONFLICT(trip_id) DO NOTHING;
 UPDATE orders SET refund_status=CASE WHEN t.payment_provider='razorpay' THEN 'manual_required' ELSE 'processing' END
  WHERE trip_id=p_trip AND refund_status='none';
END $function$
;

CREATE OR REPLACE FUNCTION public.claim_checkout_expiry_reconciliation(p_limit integer DEFAULT 25)
 RETURNS TABLE(kind text, target_id uuid, provider_order_id text, total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE cutoff timestamptz:=checkout_clock()-interval '20 minutes'; singles uuid[]; trip_ids uuid[];
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Batch limit must be 1–100'; END IF;
 SELECT coalesce(array_agg(q.target_id),'{}') INTO singles FROM (
  SELECT s.target_id FROM orders o JOIN checkout_payment_sessions s ON s.kind='order' AND s.target_id=o.id
  WHERE o.trip_id IS NULL AND o.status='placed' AND o.payment_method='online' AND o.provider_payment_id IS NULL
   AND o.placed_at<=cutoff AND s.provider_order_id IS NOT NULL AND s.payment_provider='cashfree' AND s.expiry_checked_at IS NULL AND s.expiry_lease_until<now()
  ORDER BY o.placed_at,o.id LIMIT p_limit FOR UPDATE OF s SKIP LOCKED
 ) q;
 SELECT coalesce(array_agg(q.target_id),'{}') INTO trip_ids FROM (
  SELECT s.target_id FROM trips tr JOIN checkout_payment_sessions s ON s.kind='trip' AND s.target_id=tr.id
  WHERE tr.status='placed' AND tr.provider_payment_id IS NULL
   AND EXISTS(SELECT 1 FROM orders c WHERE c.trip_id=tr.id AND c.payment_method='online' AND c.placed_at<=cutoff)
   AND s.provider_order_id IS NOT NULL AND s.payment_provider='cashfree' AND s.expiry_checked_at IS NULL AND s.expiry_lease_until<now()
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
  if p_mode='upi' and s.provider_order_id is not null and s.upi_state is null then
    update checkout_payment_sessions set upi_state='creating' where kind=p_kind and target_id=p_target_id returning * into s;
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
  if t.payment_provider='razorpay' then
   -- Legs carry the admin-visible status mark_order_refund_manual completes.
   perform 1 from orders where trip_id=t.id order by id for update;
   update orders set refund_status='manual_required' where trip_id=t.id and refund_status in ('none','processing','failed');
  end if;
 end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.ensure_trip_refund_intent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NEW.status='cancelled' AND NEW.provider_payment_id IS NOT NULL AND NEW.total>0 THEN
  PERFORM enqueue_trip_refund(NEW.id);
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.expire_checkout_reservation_batch(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE t public.trips; o public.orders; rows jsonb:='[]'; affected jsonb;
 singles integer:=0; trip_count integer:=0; target_trips uuid[]; target_singles uuid[];
 cutoff timestamptz:=checkout_clock()-interval '20 minutes';
 hard_cutoff timestamptz:=cutoff-interval '30 minutes';
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Batch limit must be 1–100'; END IF;
 PERFORM set_config('lock_timeout','1000ms',true);
 SELECT coalesce(array_agg(q.id),'{}') INTO target_trips FROM (
  SELECT tr.id FROM public.trips tr WHERE tr.status='placed' AND tr.provider_payment_id IS NULL
   AND EXISTS(SELECT 1 FROM public.orders child WHERE child.trip_id=tr.id AND child.payment_method='online' AND child.placed_at<=cutoff)
   AND (tr.created_at<=hard_cutoff OR NOT EXISTS(SELECT 1 FROM public.checkout_payment_sessions s WHERE s.kind='trip' AND s.target_id=tr.id
    AND s.provider_order_id IS NOT NULL AND s.expiry_checked_at IS NULL))
  ORDER BY tr.created_at,tr.id LIMIT p_limit FOR UPDATE SKIP LOCKED
 ) q;
 SELECT coalesce(array_agg(q.id),'{}') INTO target_singles FROM (
  SELECT ord.id FROM public.orders ord WHERE ord.trip_id IS NULL AND ord.status='placed'
   AND ord.payment_method='online' AND ord.provider_payment_id IS NULL AND ord.placed_at<=cutoff
   AND (ord.placed_at<=hard_cutoff OR NOT EXISTS(SELECT 1 FROM public.checkout_payment_sessions s WHERE s.kind='order' AND s.target_id=ord.id
    AND s.provider_order_id IS NOT NULL AND s.expiry_checked_at IS NULL))
  ORDER BY ord.placed_at,ord.id LIMIT p_limit FOR UPDATE SKIP LOCKED
 ) q;
 PERFORM 1 FROM public.orders WHERE trip_id=ANY(target_trips) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.products WHERE id IN (
  SELECT product_id FROM public.inventory_reservations r WHERE r.state='held'
   AND (r.order_id=ANY(target_singles) OR r.order_id IN(SELECT id FROM public.orders WHERE trip_id=ANY(target_trips)))
 ) ORDER BY id FOR UPDATE;
 FOR t IN SELECT * FROM public.trips WHERE id=ANY(target_trips) ORDER BY id LOOP
  trip_count:=trip_count+1;
  WITH cancelled AS (
   UPDATE public.orders SET status='cancelled',cancel_reason='Payment was not completed in time.'
   WHERE trip_id=t.id AND status='placed' AND provider_payment_id IS NULL RETURNING id,customer_id
  ) SELECT coalesce(jsonb_agg(to_jsonb(cancelled)),'[]') INTO affected FROM cancelled;
  rows:=rows||affected;
  UPDATE public.trips SET status='cancelled' WHERE id=t.id;
 END LOOP;
 FOR o IN SELECT * FROM public.orders WHERE id=ANY(target_singles) ORDER BY id LOOP
  singles:=singles+1;
  UPDATE public.orders SET status='cancelled',cancel_reason='Payment was not completed in time.' WHERE id=o.id;
  rows:=rows||jsonb_build_array(jsonb_build_object('id',o.id,'customer_id',o.customer_id));
 END LOOP;
 RETURN jsonb_build_object('cancelled_orders',jsonb_array_length(rows),'single_targets',singles,'trip_targets',trip_count,'cancelled',rows);
END $function$
;

CREATE OR REPLACE FUNCTION public.fail_assigned_trip(p_trip uuid, p_rider uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE t trips;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_trip::text,790));
 SELECT * INTO t FROM trips WHERE id=p_trip FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=p_trip AND rider_id=p_rider)
 OR EXISTS(SELECT 1 FROM orders WHERE trip_id=p_trip AND(rider_id IS DISTINCT FROM p_rider OR status NOT IN('out_for_delivery','delivered','failed'))) THEN
  RAISE EXCEPTION 'Trip is not ready for a delivery failure'; END IF;
 IF coalesce(length(p_reason),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Failure reason required'; END IF;
 PERFORM 1 FROM orders WHERE trip_id=p_trip ORDER BY id FOR UPDATE;
 UPDATE orders SET status='failed',cancel_reason=p_reason WHERE trip_id=p_trip AND status='out_for_delivery';
 RETURN jsonb_build_object('trip_id',p_trip,'status','failed','refund_review_required',t.provider_payment_id IS NOT NULL);
END $function$
;

CREATE OR REPLACE FUNCTION public.finish_checkout_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.inventory_reservations;
begin
  if new.status='cancelled' and old.status in ('placed','packed') and old.picked_up_at is null then
    -- Always lock parent products in the same order, including multi-pack lines.
    perform 1 from public.products where id in(select product_id from inventory_reservations where order_id=new.id and state in ('held','committed')) order by id for update;
    for r in select * from inventory_reservations where order_id=new.id and state in ('held','committed') order by product_id,order_item_id for update loop
      update inventory_reservations set state='released',expires_at=null where order_item_id=r.order_item_id;
      update public.products set stock_quantity=stock_quantity+r.quantity where id=r.product_id;
    end loop;
  elsif new.status in ('out_for_delivery','delivered','failed') then
    update inventory_reservations set state='consumed',expires_at=null where order_id=new.id and state in ('held','committed');
  elsif new.provider_payment_id is not null then
    update inventory_reservations set state='committed',expires_at=null where order_id=new.id and state='held';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_checkout_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if TG_OP = 'INSERT' then
    perform checkout_assert_store(new.customer_id,new.address_id,new.store_id);
  else
    if new.status is distinct from old.status and not (
      (old.status='placed' and new.status in ('packed','cancelled'))
      or (old.status='packed' and new.status in ('out_for_delivery','cancelled'))
      or (old.status='out_for_delivery' and new.status in ('delivered','failed'))
    ) then raise exception using errcode='P1001', message='Invalid order state transition'; end if;
    if new.status in ('packed','out_for_delivery') and new.payment_method='online' and new.provider_payment_id is null then
      raise exception using errcode='P1001', message='Awaiting payment'; end if;
  end if;
  return new;
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
   CASE WHEN NEW.refund_status='completed' THEN 'completed' WHEN NEW.payment_provider='razorpay' THEN 'manual_required' ELSE 'queued' END) ON CONFLICT(order_id) DO NOTHING;
  END IF;
  IF NEW.refund_status='none' THEN NEW.refund_status:=CASE WHEN NEW.payment_provider='razorpay' THEN 'manual_required' ELSE 'processing' END; END IF;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.record_customer_order_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare heading text; copy text;
begin
 if TG_OP='UPDATE' then
  if new.status=old.status and not (new.status='placed' and old.provider_payment_id is null and new.provider_payment_id is not null) then return new; end if;
 end if;
 if new.status='placed' and new.payment_method='online' and new.provider_payment_id is null then return new; end if;
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
end $function$
;

CREATE OR REPLACE FUNCTION public.release_abandoned_promotion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE redemption promo_redemptions;
BEGIN
 IF NEW.status<>'cancelled' OR OLD.status='cancelled' OR NEW.provider_payment_id IS NOT NULL THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='orders' THEN
  IF NEW.trip_id IS NOT NULL OR NEW.payment_method<>'online' THEN RETURN NEW; END IF;
  SELECT * INTO redemption FROM promo_redemptions WHERE order_id=NEW.id;
 ELSE
  -- Trips have no payment-method field: require all legs to be unpaid online.
  IF EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.id AND (payment_method<>'online' OR provider_payment_id IS NOT NULL)) THEN RETURN NEW; END IF;
  SELECT * INTO redemption FROM promo_redemptions WHERE trip_id=NEW.id;
 END IF;
 IF NOT FOUND THEN RETURN NEW; END IF;
 PERFORM 1 FROM promo_codes WHERE id=redemption.promo_code_id FOR UPDATE;
 DELETE FROM promo_redemptions WHERE promo_code_id=redemption.promo_code_id AND customer_id=redemption.customer_id
  AND order_id IS NOT DISTINCT FROM redemption.order_id AND trip_id IS NOT DISTINCT FROM redemption.trip_id;
 IF FOUND THEN UPDATE promo_codes SET times_used=greatest(0,times_used-1) WHERE id=redemption.promo_code_id; END IF;
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
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND OR o.trip_id IS NOT NULL OR o.status NOT IN('failed','cancelled') OR o.provider_payment_id IS NULL OR o.total<=0 THEN
  RAISE EXCEPTION 'Order is not eligible for a single-order refund'; END IF;
 INSERT INTO order_refund_jobs(order_id,payment_id,target_paise,provider_refund_id,status)
 VALUES(o.id,o.provider_payment_id,round(o.total*100)::bigint,o.provider_refund_id,
 CASE WHEN o.refund_status='completed' THEN 'completed' WHEN o.payment_provider='razorpay' THEN 'manual_required' ELSE 'queued' END) ON CONFLICT(order_id) DO NOTHING;
 PERFORM retry_order_refund(o.id);
 UPDATE orders SET refund_status=CASE WHEN o.payment_provider='razorpay' THEN 'manual_required' ELSE 'processing' END
  WHERE id=o.id AND refund_status<>'completed';
END $function$
;

CREATE OR REPLACE FUNCTION public.reserve_checkout_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE p products; o orders; v product_variants; pack_count integer;
BEGIN
 SELECT * INTO p FROM products WHERE id=NEW.product_id FOR UPDATE;
 IF NOT FOUND OR p.approval_status IS DISTINCT FROM 'approved' OR NOT p.is_in_stock OR p.stock_status='out_of_stock' THEN
  RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Product unavailable'; END IF;
 IF NOT p.stock_tracking_enabled OR p.stock_quantity IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Stock has not been confirmed by the shop'; END IF;
 IF p.stock_quantity<NEW.quantity THEN RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Insufficient stock'; END IF;
 IF NEW.variant_id IS NOT NULL THEN
  SELECT * INTO v FROM product_variants WHERE id=NEW.variant_id AND product_id=p.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Pack unavailable'; END IF;
  SELECT count(*) INTO pack_count FROM product_variants WHERE product_id=p.id;
  IF (pack_count>1 AND v.stock_quantity IS NULL) OR (v.stock_quantity IS NOT NULL AND v.stock_quantity<NEW.quantity) THEN
   RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Selected pack has insufficient or unconfirmed stock'; END IF;
  IF v.stock_quantity IS NOT NULL THEN UPDATE product_variants SET stock_quantity=stock_quantity-NEW.quantity WHERE id=v.id; END IF;
 ELSIF EXISTS(SELECT 1 FROM product_variants WHERE product_id=p.id) THEN
  RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Select an actual product pack';
 END IF;
 SELECT * INTO o FROM orders WHERE id=NEW.order_id;
 UPDATE products SET stock_quantity=stock_quantity-NEW.quantity WHERE id=p.id;
 INSERT INTO inventory_reservations(order_item_id,order_id,product_id,variant_id,quantity,state,expires_at)
 VALUES(NEW.id,NEW.order_id,p.id,CASE WHEN v.stock_quantity IS NOT NULL THEN v.id ELSE null END,NEW.quantity,
 CASE WHEN o.payment_method='cod' OR o.provider_payment_id IS NOT NULL THEN 'committed' ELSE 'held' END,
 CASE WHEN o.payment_method='online' AND o.provider_payment_id IS NULL THEN o.placed_at+interval '20 minutes' ELSE null END);
 RETURN NEW;
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
 SELECT * INTO j FROM order_refund_jobs WHERE order_id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No durable refund intent'; END IF;
 IF j.status='failed' AND EXISTS(SELECT 1 FROM orders WHERE id=p_order AND payment_provider='razorpay') THEN
  -- Legacy (pre-Cashfree) capture: never re-sent to Cashfree; admin refunds by hand.
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

CREATE OR REPLACE FUNCTION public.review_customer_deletion(p_id uuid, p_actor uuid, p_approve boolean, p_note text)
 RETURNS customer_deletion_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result customer_deletion_requests; customer uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor AND role='admin') OR coalesce(length(btrim(p_note)),0) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Admin and review note required'; END IF;
 SELECT customer_id INTO customer FROM customer_deletion_requests WHERE id=p_id;
 PERFORM 1 FROM users WHERE id=customer FOR UPDATE;
 SELECT * INTO result FROM customer_deletion_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request unavailable'; END IF;
 IF result.status='completed' THEN RETURN result; END IF;
 IF result.status='approved' AND NOT p_approve THEN RAISE EXCEPTION 'Approved identity removal cannot be rejected'; END IF;
 IF result.status NOT IN('pending','approved') THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
 IF p_approve AND (EXISTS(SELECT 1 FROM orders WHERE customer_id=customer AND(status IN('placed','packed','out_for_delivery') OR(status IN('cancelled','failed') AND provider_payment_id IS NOT NULL AND refund_status IS DISTINCT FROM 'completed')))
  OR EXISTS(SELECT 1 FROM support_tickets WHERE customer_id=customer AND status IN('open','in_progress'))) THEN RAISE EXCEPTION 'Resolve active orders, refunds and support before deletion'; END IF;
 UPDATE customer_deletion_requests SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,review_note=p_note,reviewer_id=p_actor,reviewed_at=now() WHERE id=p_id RETURNING * INTO result;
 RETURN result;
END $function$
;

CREATE OR REPLACE FUNCTION public.save_order_refund(p_id uuid, p_lease uuid, p_patch jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j order_refund_jobs;
BEGIN
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
 IF j.status IN('processing','completed','failed') THEN
  UPDATE orders SET refund_status=j.status,provider_refund_id=j.provider_refund_id,
    refunded_at=CASE WHEN j.status='completed' THEN coalesce(refunded_at,now()) ELSE refunded_at END
  WHERE id=j.order_id AND refund_status<>'completed';
 END IF;
 RETURN true;
END $function$
;

CREATE OR REPLACE FUNCTION public.settle_checkout_payment(p_order_id uuid, p_trip_id uuid, p_payment_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE o public.orders; t public.trips; rejected boolean; old_payment text;
BEGIN
  IF (p_order_id IS NULL)=(p_trip_id IS NULL) OR nullif(p_payment_id,'') IS NULL THEN RAISE EXCEPTION 'Invalid payment target'; END IF;
  IF p_trip_id IS NOT NULL THEN
    SELECT * INTO t FROM public.trips WHERE id=p_trip_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
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
      (status='cancelled' OR (payment_method='online' AND provider_payment_id IS NULL AND placed_at+interval '20 minutes'<=checkout_clock())));
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
    rejected:=o.status='cancelled' OR (o.payment_method='online' AND o.placed_at+interval '20 minutes'<=checkout_clock());
    IF rejected AND o.status IN ('placed','packed') THEN
      UPDATE public.orders SET status='cancelled',cancel_reason='Payment arrived after checkout closed.' WHERE id=o.id;
    END IF;
    -- 080's BEFORE UPDATE trigger queues the refund when rejected.
    UPDATE public.orders SET provider_payment_id=p_payment_id,checkout_payment_rejected=rejected WHERE id=o.id;
    RETURN jsonb_build_object('accepted',NOT rejected,'total',o.total,'settled_now',true);
  END IF;
END $function$

;

REVOKE ALL ON FUNCTION
 public.abandon_unpaid_checkout(uuid,text,uuid,text,text),
 public.approve_failed_trip_refund(uuid,bigint),
 public.claim_checkout_expiry_reconciliation(integer),
 public.claim_checkout_payment(uuid,text,uuid,text),
 public.enqueue_trip_refund(uuid),
 public.ensure_trip_refund_intent(),
 public.expire_checkout_reservation_batch(integer),
 public.fail_assigned_trip(uuid,uuid,text),
 public.finish_checkout_stock(),
 public.guard_checkout_order(),
 public.queue_cancelled_order_refund(),
 public.record_customer_order_notification(),
 public.release_abandoned_promotion(),
 public.request_order_refund(uuid),
 public.reserve_checkout_stock(),
 public.retry_order_refund(uuid),
 public.review_customer_deletion(uuid,uuid,boolean,text),
 public.save_order_refund(uuid,uuid,jsonb),
 public.settle_checkout_payment(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.abandon_unpaid_checkout(uuid,text,uuid,text,text),
 public.approve_failed_trip_refund(uuid,bigint),
 public.claim_checkout_expiry_reconciliation(integer),
 public.claim_checkout_payment(uuid,text,uuid,text),
 public.enqueue_trip_refund(uuid),
 public.ensure_trip_refund_intent(),
 public.expire_checkout_reservation_batch(integer),
 public.fail_assigned_trip(uuid,uuid,text),
 public.finish_checkout_stock(),
 public.guard_checkout_order(),
 public.queue_cancelled_order_refund(),
 public.record_customer_order_notification(),
 public.release_abandoned_promotion(),
 public.request_order_refund(uuid),
 public.reserve_checkout_stock(),
 public.retry_order_refund(uuid),
 public.review_customer_deletion(uuid,uuid,boolean,text),
 public.save_order_refund(uuid,uuid,jsonb),
 public.settle_checkout_payment(uuid,uuid,text)
 TO service_role;

-- Admin recorded a by-hand refund of a legacy Razorpay capture. A trip leg
-- completes the whole trip refund (one capture per trip). Lock order matches
-- cancellation/settlement: trip -> legs by id -> refund row.
CREATE FUNCTION public.mark_order_refund_manual(p_order uuid, p_reference text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; ref text:='manual:'||btrim(p_reference);
BEGIN
 IF coalesce(length(btrim(p_reference)),0) NOT BETWEEN 4 AND 64 THEN RAISE EXCEPTION 'Refund reference must be 4-64 characters'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF o.trip_id IS NOT NULL THEN
  PERFORM 1 FROM public.trips WHERE id=o.trip_id FOR UPDATE;
  PERFORM 1 FROM public.orders WHERE trip_id=o.trip_id ORDER BY id FOR UPDATE;
  SELECT * INTO o FROM public.orders WHERE id=p_order;
  IF o.refund_status<>'manual_required' THEN RAISE EXCEPTION 'Refund is not awaiting a manual refund'; END IF;
  UPDATE public.trip_refunds SET status='completed',provider_refund_id=ref,refunded_paise=target_paise,
   lease_token=null,lease_until=null,last_error=null,updated_at=now()
  WHERE trip_id=o.trip_id AND status='manual_required';
  UPDATE public.orders SET refund_status='completed',provider_refund_id=ref,refunded_at=now()
  WHERE trip_id=o.trip_id AND refund_status='manual_required';
 ELSE
  SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
  IF o.refund_status<>'manual_required' THEN RAISE EXCEPTION 'Refund is not awaiting a manual refund'; END IF;
  UPDATE public.orders SET refund_status='completed',provider_refund_id=ref,refunded_at=now() WHERE id=p_order;
  UPDATE public.order_refund_jobs SET status='completed',provider_refund_id=ref,lease_token=null,lease_until=null,
   last_error=null,updated_at=now() WHERE order_id=p_order;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.mark_order_refund_manual(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_refund_manual(uuid,text) TO service_role;

-- One-time backfill with user triggers off: it must not bump tracking
-- revisions, queue refunds or write customer refund history.
ALTER TABLE public.orders DISABLE TRIGGER USER;
ALTER TABLE public.trips DISABLE TRIGGER USER;
ALTER TABLE public.trip_refunds DISABLE TRIGGER USER;
UPDATE public.orders SET payment_provider='razorpay' WHERE provider_payment_id IS NOT NULL;
UPDATE public.trips SET payment_provider='razorpay' WHERE provider_payment_id IS NOT NULL;
UPDATE public.checkout_payment_sessions SET payment_provider='razorpay' WHERE provider_order_id IS NOT NULL OR upi_payment_id IS NOT NULL;
-- Before this migration every refund was a Razorpay refund (including late
-- captures after a COD switch, whose order carries no payment id).
UPDATE public.order_refund_jobs SET status='manual_required',lease_token=null,lease_until=null,updated_at=now()
 WHERE status IN ('queued','processing','failed');
UPDATE public.trip_refunds SET status='manual_required',lease_token=null,lease_until=null,updated_at=now()
 WHERE status IN ('queued','processing','failed');
UPDATE public.orders SET refund_status='manual_required' WHERE refund_status IN ('processing','failed');
UPDATE public.orders o SET refund_status='manual_required' FROM public.trip_refunds r
 WHERE r.trip_id=o.trip_id AND r.status='manual_required' AND o.refund_status='none';
ALTER TABLE public.orders ENABLE TRIGGER USER;
ALTER TABLE public.trips ENABLE TRIGGER USER;
ALTER TABLE public.trip_refunds ENABLE TRIGGER USER;

NOTIFY pgrst,'reload schema';
COMMIT;
