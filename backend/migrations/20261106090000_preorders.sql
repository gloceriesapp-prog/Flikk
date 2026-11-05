-- Pre-orders (2026-11-06): idli, dosa batter, chicken and the like ordered
-- in bulk for a later day and delivery slot. They live only in the Home
-- "Pre-orders" section; the store accepts them like any order.
--
-- 1. products: preorder_enabled (pre-order only: hidden from every other
--    feed, never sold for instant delivery), preorder_min_qty (the bulk
--    minimum, in packs, per order) and preorder_lead_days (earliest day,
--    1 = tomorrow).
-- 2. preorder_slots: the delivery windows a customer picks from (IST
--    minutes of the day). Public read; edited with the service role.
-- 3. orders.deliver_from / deliver_until: the chosen window. Set by
--    create_checkout_attempt from p_args, which also refuses an order that
--    mixes pre-order and instant products, or a pre-order trip.
-- 4. The store gets up to 3 hours to accept a pre-order (never past the
--    slot); its preparation deadline is the slot start; riders are offered
--    it only from 45 minutes before the slot; admin does not count a
--    pre-order waiting for its day as stuck.
-- 5. Home section row 'preorders'.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preorder_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preorder_min_qty integer NOT NULL DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preorder_lead_days integer NOT NULL DEFAULT 1;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_preorder_check;
ALTER TABLE public.products ADD CONSTRAINT products_preorder_check
  CHECK (preorder_min_qty BETWEEN 1 AND 999 AND preorder_lead_days BETWEEN 1 AND 14);
CREATE INDEX IF NOT EXISTS products_preorder_idx ON public.products(store_id) WHERE preorder_enabled AND approval_status = 'approved';

CREATE TABLE IF NOT EXISTS public.preorder_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 40),
  starts_minute integer NOT NULL CHECK (starts_minute BETWEEN 0 AND 1439),
  ends_minute integer NOT NULL CHECK (ends_minute BETWEEN 1 AND 1440),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CHECK (ends_minute > starts_minute)
);
ALTER TABLE public.preorder_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS preorder_slots_public_read ON public.preorder_slots;
CREATE POLICY preorder_slots_public_read ON public.preorder_slots FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.preorder_slots FROM anon, authenticated;
GRANT SELECT ON public.preorder_slots TO anon, authenticated;
GRANT ALL ON public.preorder_slots TO service_role;
INSERT INTO public.preorder_slots (label, starts_minute, ends_minute, sort_order)
SELECT * FROM (VALUES ('7 – 9 AM', 420, 540, 1), ('12 – 2 PM', 720, 840, 2), ('6 – 8 PM', 1080, 1200, 3)) v
WHERE NOT EXISTS (SELECT 1 FROM public.preorder_slots);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deliver_from timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deliver_until timestamptz;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_deliver_window_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_deliver_window_check
  CHECK ((deliver_from IS NULL) = (deliver_until IS NULL) AND (deliver_until IS NULL OR deliver_until > deliver_from));
CREATE INDEX IF NOT EXISTS orders_deliver_from_idx ON public.orders(store_id, deliver_from) WHERE deliver_from IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_checkout_attempt(p_customer_id uuid, p_attempt_id uuid, p_fingerprint text, p_kind text, p_args jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a checkout_attempts; v_result jsonb; v_from timestamptz := (p_args->>'p_deliver_from')::timestamptz;
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
    -- Pre-order products only with a slot, and a slot only for them.
    if exists(select 1 from order_items i join products p on p.id=i.product_id
              where i.order_id=(v_result->>'id')::uuid and p.preorder_enabled is distinct from (v_from is not null)) then
      raise exception using errcode='40001', message='Pre-order items need their own checkout';
    end if;
    if v_from is not null then
      -- Same pre-order window stamp_store_visible_at gives an online order once paid.
      update orders set deliver_from=v_from, deliver_until=(p_args->>'p_deliver_until')::timestamptz,
        acceptance_deadline_at=case when store_visible_at is not null then least(store_visible_at+interval '3 hours',v_from) end
        where id=(v_result->>'id')::uuid;
      select to_jsonb(o) into v_result from orders o where o.id=(v_result->>'id')::uuid;
    end if;
  elsif p_kind='trip' then
    if v_from is not null then raise exception using errcode='40001', message='Pre-orders come from one shop'; end if;
    select to_jsonb(t) into v_result from create_trip_orders(p_customer_id,(p_args->>'p_address_id')::uuid,
      (p_args->>'p_delivery_fee')::numeric,(p_args->>'p_item_total')::numeric,(p_args->>'p_total')::numeric,
      p_args->'p_legs',(p_args->>'p_promo_code_id')::uuid,(p_args->>'p_discount_amount')::numeric,
      p_args->>'p_payment_method',(p_args->>'p_handling_fee')::numeric) t;
    if exists(select 1 from orders o join order_items i on i.order_id=o.id join products p on p.id=i.product_id
              where o.trip_id=(v_result->>'id')::uuid and p.preorder_enabled) then
      raise exception using errcode='40001', message='Pre-order items need their own checkout';
    end if;
  else raise exception 'Invalid checkout kind'; end if;
  update checkout_attempts set result=v_result where customer_id=p_customer_id and attempt_id=p_attempt_id;
  return jsonb_build_object('result',v_result,'replayed',false);
end $function$;

CREATE OR REPLACE FUNCTION public.stamp_store_visible_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE response_minutes integer; preparation_minutes integer;
BEGIN
 IF NEW.status='placed' AND (NEW.payment_method='cod' OR NEW.provider_payment_id IS NOT NULL)
    AND NOT coalesce(NEW.checkout_payment_rejected,false) THEN
  NEW.store_visible_at:=coalesce(NEW.store_visible_at,now());
  IF NEW.acceptance_deadline_at IS NULL AND NEW.deliver_from IS NOT NULL THEN
   -- A pre-order is planned ahead: up to 3 hours, never past its slot.
   NEW.acceptance_deadline_at:=least(NEW.store_visible_at+interval '3 hours',NEW.deliver_from);
  ELSIF NEW.acceptance_deadline_at IS NULL THEN
   -- Bulk orders give the store longer to check it can supply them.
   SELECT CASE WHEN NEW.is_bulk THEN bulk_response_timeout_minutes ELSE store_response_timeout_minutes END
     INTO response_minutes FROM public.delivery_settings LIMIT 1;
   NEW.acceptance_deadline_at:=NEW.store_visible_at+make_interval(mins=>coalesce(response_minutes,CASE WHEN NEW.is_bulk THEN 30 ELSE 10 END));
  END IF;
 END IF;
 -- Older clients can still mark packed directly. Enforce the same payment and
 -- response deadline and atomically record their acceptance before dispatch.
 IF TG_OP='UPDATE' AND OLD.status='placed' AND NEW.status='packed' AND OLD.accepted_at IS NULL THEN
  IF NEW.store_visible_at IS NULL OR coalesce(NEW.checkout_payment_rejected,false)
     OR (NEW.payment_method<>'cod' AND NEW.provider_payment_id IS NULL) THEN
   RAISE EXCEPTION USING errcode='P0409',message='PAYMENT_PENDING';
  END IF;
  IF NEW.acceptance_deadline_at<=now() THEN
   RAISE EXCEPTION USING errcode='P0409',message='ACCEPTANCE_EXPIRED';
  END IF;
  NEW.accepted_at:=now();
  SELECT avg_prep_minutes INTO preparation_minutes FROM public.stores WHERE id=NEW.store_id;
  NEW.preparation_deadline_at:=CASE WHEN preparation_minutes IS NOT NULL THEN NEW.accepted_at+make_interval(mins=>greatest(0,preparation_minutes)) END;
 END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.partner_accept_order(p_order uuid, p_store uuid, p_user uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE o public.orders; preparation_minutes integer;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order AND store_id=p_store;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='ORDER_NOT_FOUND'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.users u JOIN public.stores s ON s.id=p_store
   WHERE u.id=p_user AND u.role='store_owner' AND u.is_approved AND NOT coalesce(u.partner_suspended,false)
     AND EXISTS(SELECT 1 FROM public.users owner_account WHERE owner_account.id=s.owner_user_id AND NOT coalesce(owner_account.partner_suspended,false))
     AND NOT coalesce(s.admin_suspended,false) AND
     (s.owner_user_id=p_user OR EXISTS(SELECT 1 FROM public.store_memberships m WHERE m.store_id=s.id AND m.user_id=p_user AND m.is_active))) THEN
  RAISE EXCEPTION USING errcode='P0403',message='STORE_ACCESS_DENIED';
 END IF;
 -- Shared cancellation/acceptance coordination: advisory scope before row locks.
 PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(o.trip_id,o.id)::text,790));
 SELECT * INTO o FROM public.orders WHERE id=p_order AND store_id=p_store FOR UPDATE;
 IF o.status NOT IN('placed','packed') THEN RAISE EXCEPTION USING errcode='P0409',message='ORDER_CHANGED'; END IF;
 IF coalesce(o.checkout_payment_rejected,false) OR o.store_visible_at IS NULL
    OR (o.payment_method<>'cod' AND o.provider_payment_id IS NULL) THEN
  RAISE EXCEPTION USING errcode='P0409',message='PAYMENT_PENDING';
 END IF;
 IF o.accepted_at IS NOT NULL THEN RETURN o; END IF;
 IF o.acceptance_deadline_at IS NULL OR o.acceptance_deadline_at<=now() THEN
  RAISE EXCEPTION USING errcode='P0409',message='ACCEPTANCE_EXPIRED';
 END IF;
 SELECT avg_prep_minutes INTO preparation_minutes FROM public.stores WHERE id=p_store;
 -- A pre-order is ready for its slot, not minutes from now.
 UPDATE public.orders SET accepted_at=now(),preparation_deadline_at=CASE WHEN o.deliver_from IS NOT NULL THEN o.deliver_from
   WHEN preparation_minutes IS NOT NULL THEN now()+make_interval(mins=>greatest(0,preparation_minutes)) END
  WHERE id=o.id RETURNING * INTO o;
 RETURN o;
END $function$;

CREATE OR REPLACE FUNCTION public.advance_dispatch_offers(p_limit integer DEFAULT 100, p_order uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, store_id uuid, store_name text, lat double precision, lng double precision, radius_m integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 WITH cfg AS (SELECT c.*,c.steps[cardinality(c.steps)] AS widest,
   coalesce((SELECT d.dispatch_after_accept_seconds FROM delivery_settings d LIMIT 1),15) AS accept_delay
  FROM public.dispatch_config() c
 ), due AS (
  SELECT o.id FROM public.orders o JOIN public.stores s ON s.id=o.store_id CROSS JOIN cfg
  WHERE o.rider_id IS NULL AND public.order_awaits_rider(o.status,o.accepted_at)
   AND (o.status='packed' OR o.accepted_at<=now()-make_interval(secs=>cfg.accept_delay))
   -- Pre-orders reach riders only shortly before their slot.
   AND (o.deliver_from IS NULL OR o.deliver_from<=now()+interval '45 minutes')
   AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
   AND (p_order IS NULL OR o.id=p_order)
   AND (o.dispatch_broadcast_at IS NULL OR (p_order IS NULL AND (
    (coalesce(o.dispatch_radius_m,cfg.steps[1])<cfg.widest AND o.dispatch_broadcast_at<now()-make_interval(secs=>cfg.step_seconds))
    OR (coalesce(o.dispatch_radius_m,cfg.steps[1])>=cfg.widest AND o.dispatch_broadcast_at<now()-make_interval(secs=>greatest(cfg.step_seconds,60))))))
  ORDER BY o.dispatch_broadcast_at NULLS FIRST,o.id LIMIT least(greatest(p_limit,1),100) FOR UPDATE OF o SKIP LOCKED
 ), advanced AS (
 UPDATE public.orders o SET dispatch_radius_m=CASE WHEN o.dispatch_broadcast_at IS NULL THEN cfg.steps[1]
   ELSE coalesce((SELECT min(x) FROM unnest(cfg.steps) x WHERE x>coalesce(o.dispatch_radius_m,0)),cfg.widest) END,
  dispatch_broadcast_at=now(),dispatch_attempts=o.dispatch_attempts+1
 FROM due,cfg WHERE o.id=due.id RETURNING o.id,o.store_id,o.dispatch_radius_m
 ) SELECT a.id,a.store_id,s.name,s.lat,s.lng,a.dispatch_radius_m FROM advanced a JOIN public.stores s ON s.id=a.store_id;
$function$;

CREATE OR REPLACE FUNCTION public.admin_attention_counts(p_now timestamp with time zone DEFAULT now(), p_stuck_minutes integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select jsonb_build_object(
    'pendingStoreApplications', (select count(*) from store_onboarding_drafts d join users u on u.id = d.user_id
      where d.submitted_at is not null and not coalesce(u.is_rejected, false)),
    'pendingRiderApplications', (select count(*) from rider_onboarding_drafts d join users u on u.id = d.user_id
      where d.submitted_at is not null and not coalesce(u.is_rejected, false)),
    'pendingProducts', (select count(*) from products where approval_status = 'pending' or pending_image_url is not null),
    'refundsNeedingAction', (select count(distinct coalesce(trip_id,id)) from orders where refund_status in ('failed','manual_required')),
    'openSupportTickets', (select count(*) from support_tickets where status = 'open'),
    -- A pre-order waiting for its day is not stuck (accepted ones wait until the slot).
    'stuckOrders', (select count(*) from orders where rider_id is null
      and (deliver_from is null or (accepted_at is null and status = 'placed') or deliver_from <= p_now) and (
      (status = 'placed' and placed_at < p_now - make_interval(mins => greatest(p_stuck_minutes, 1)))
      or (status = 'packed' and coalesce(packed_at, placed_at) < p_now - make_interval(mins => greatest(p_stuck_minutes, 1))))),
    'noRiderFound', (select count(*) from admin_dispatch_board(true, 200, 0))
  );
$function$;

INSERT INTO public.home_sections (key, title, sort_index)
SELECT 'preorders', null, coalesce((SELECT sort_index FROM public.home_sections WHERE key = 'trending'), 30) - 1
ON CONFLICT (key) DO NOTHING;

COMMIT;
NOTIFY pgrst, 'reload schema';
