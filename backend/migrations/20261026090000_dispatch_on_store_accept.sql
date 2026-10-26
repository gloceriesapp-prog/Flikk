-- Rider search starts when the store ACCEPTS an order, not when it is packed.
--
-- Before: advance_dispatch_offers only looked at packed orders, so the rider's
-- ride to the shop started after packing and added to every delivery time.
-- Now an order is dispatchable once the store has accepted it and
-- dispatch_after_accept_seconds (admin setting, default 15 s) have passed, or
-- once it is packed if the store packed straight away. The rider can accept
-- early, but pickup (packed -> out_for_delivery) still needs the store to mark
-- the order packed: that transition and its guards are unchanged.
--
-- Also: after the widest ring, the worker keeps re-offering the order at that
-- ring (at most once a minute) instead of going silent until an admin looks.
-- admin_dispatch_board marks such orders out_of_offers from the first repeat.
BEGIN;
SET LOCAL lock_timeout='5s';

ALTER TABLE public.delivery_settings
 ADD COLUMN IF NOT EXISTS dispatch_after_accept_seconds integer NOT NULL DEFAULT 15;
ALTER TABLE public.delivery_settings DROP CONSTRAINT IF EXISTS delivery_settings_dispatch_after_accept_check;
ALTER TABLE public.delivery_settings ADD CONSTRAINT delivery_settings_dispatch_after_accept_check
 CHECK(dispatch_after_accept_seconds BETWEEN 0 AND 600);

-- The one definition of "a rider may be found for this order": the store has
-- accepted it (still packing) or it is already packed.
CREATE OR REPLACE FUNCTION public.order_awaits_rider(p_status text,p_accepted_at timestamptz)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_temp' AS $$
 SELECT p_status='packed' OR (p_status='placed' AND p_accepted_at IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION public.order_awaits_rider(text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.order_awaits_rider(text,timestamptz) TO service_role;

-- 113 + early dispatch + repeat at the widest ring. A packed order still
-- starts at once (no accept delay: the store is done). The packed trigger
-- (p_order) only ever starts a search that has not started yet.
CREATE OR REPLACE FUNCTION public.advance_dispatch_offers(p_limit integer DEFAULT 100,p_order uuid DEFAULT NULL)
RETURNS TABLE(id uuid,store_id uuid,store_name text,lat double precision,lng double precision,radius_m integer)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH cfg AS (SELECT c.*,c.steps[cardinality(c.steps)] AS widest,
   coalesce((SELECT d.dispatch_after_accept_seconds FROM delivery_settings d LIMIT 1),15) AS accept_delay
  FROM public.dispatch_config() c
 ), due AS (
  SELECT o.id FROM public.orders o JOIN public.stores s ON s.id=o.store_id CROSS JOIN cfg
  WHERE o.rider_id IS NULL AND public.order_awaits_rider(o.status,o.accepted_at)
   AND (o.status='packed' OR o.accepted_at<=now()-make_interval(secs=>cfg.accept_delay))
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
$$;
REVOKE ALL ON FUNCTION public.advance_dispatch_offers(integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.advance_dispatch_offers(integer,uuid) TO service_role;

-- 20261021090000 with order_awaits_rider in place of status='packed'.
CREATE OR REPLACE FUNCTION public.rider_dispatch_offers(p_rider uuid)
 RETURNS TABLE(order_id uuid, distance_m double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with me as (
    select r.current_lat as lat, r.current_lng as lng
    from riders r
    where r.user_id = p_rider
      and r.is_active
      and not r.is_review_account
      and r.status = 'online'
      and r.current_lat is not null
      and r.current_lng is not null
      and r.last_location_update > now() - interval '3 minutes'
      and coalesce(rider_active_trip_count(p_rider) < (select max_trips from dispatch_config()), true)
  ), distances as (
    select
      o.id,
      coalesce(o.dispatch_radius_m, 8000) as radius_m,
      6371000 * acos(least(1, greatest(-1,
        cos(radians(me.lat)) * cos(radians(s.lat)) * cos(radians(s.lng) - radians(me.lng))
        + sin(radians(me.lat)) * sin(radians(s.lat))
      ))) as distance_m
    from me
    cross join orders o
    join stores s on s.id = o.store_id
    where order_awaits_rider(o.status, o.accepted_at)
      and o.rider_id is null
      and o.dispatch_broadcast_at is not null
      and s.lat is not null
      and s.lng is not null
  )
  select id as order_id, distance_m
  from distances
  where distance_m <= radius_m
  order by distance_m asc;
$function$;
REVOKE ALL ON FUNCTION public.rider_dispatch_offers(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rider_dispatch_offers(uuid) TO service_role;

-- 20261021090000 with order_awaits_rider in place of status='packed'.
CREATE OR REPLACE FUNCTION public.accept_dispatch_offer(p_order uuid, p_rider uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE scope uuid; o orders; r riders; s stores; dist double precision;
BEGIN
 SELECT coalesce(trip_id,id) INTO scope FROM orders WHERE id=p_order;
 IF scope IS NULL THEN RETURN jsonb_build_object('accepted',false,'error','ORDER_NOT_FOUND'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(scope::text,790));
 PERFORM 1 FROM orders WHERE coalesce(trip_id,id)=scope ORDER BY id FOR UPDATE;
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF o.rider_id=p_rider THEN
  RETURN jsonb_build_object('accepted',true,'replayed',true,'order_id',o.id,'trip_id',o.trip_id); END IF;
 IF NOT order_awaits_rider(o.status,o.accepted_at) OR o.rider_id IS NOT NULL OR EXISTS(SELECT 1 FROM orders WHERE coalesce(trip_id,id)=scope
  AND status<>'cancelled' AND rider_id IS NOT NULL AND rider_id<>p_rider) THEN
  RETURN jsonb_build_object('accepted',false,'error','ALREADY_TAKEN'); END IF;
 IF o.dispatch_broadcast_at IS NULL THEN RETURN jsonb_build_object('accepted',false,'error','NOT_OFFERED'); END IF;
 SELECT * INTO r FROM riders WHERE user_id=p_rider;
 -- The Play review account never takes a real order.
 IF FOUND AND r.is_review_account THEN RETURN jsonb_build_object('accepted',false,'error','NOT_OFFERED'); END IF;
 IF NOT FOUND OR NOT r.is_active OR r.status<>'online' OR r.current_lat IS NULL OR r.current_lng IS NULL
  OR r.last_location_update IS NULL OR r.last_location_update<=now()-interval '3 minutes' THEN
  RETURN jsonb_build_object('accepted',false,'error','RIDER_OFFLINE'); END IF;
 SELECT * INTO s FROM stores WHERE id=o.store_id;
 IF s.lat IS NULL OR s.lng IS NULL THEN RETURN jsonb_build_object('accepted',false,'error','NOT_OFFERED'); END IF;
 dist:=6371000*acos(least(1,greatest(-1,
  cos(radians(r.current_lat))*cos(radians(s.lat))*cos(radians(s.lng)-radians(r.current_lng))
  +sin(radians(r.current_lat))*sin(radians(s.lat)))));
 IF dist>coalesce(o.dispatch_radius_m,8000) THEN RETURN jsonb_build_object('accepted',false,'error','NOT_OFFERED'); END IF;
 IF rider_capacity_exceeded(p_rider,scope) THEN RETURN jsonb_build_object('accepted',false,'error','RIDER_AT_CAPACITY'); END IF;
 -- One rider owns the whole trip: every unassigned live leg is claimed here.
 UPDATE orders SET rider_id=p_rider WHERE coalesce(trip_id,id)=scope AND rider_id IS NULL AND status IN('placed','packed');
 RETURN jsonb_build_object('accepted',true,'replayed',false,'order_id',o.id,'trip_id',o.trip_id);
END $function$;
REVOKE ALL ON FUNCTION public.accept_dispatch_offer(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_dispatch_offer(uuid,uuid) TO service_role;

-- 109: a founder can hand an accepted (still packing) single order to a
-- rider too, the same orders riders are now offered. Trips are unchanged.
CREATE OR REPLACE FUNCTION public.admin_assign_order_rider(p_order uuid,p_rider uuid,p_admin_email text)
 RETURNS SETOF orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE o orders; n integer;
BEGIN
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Order not found'; END IF;
 PERFORM admin_assert_assignable_rider(p_rider);
 IF o.trip_id IS NOT NULL THEN
  -- Same trip lock and split-rider refusal (P0409) as rider accept.
  RETURN QUERY SELECT * FROM assign_trip_rider(o.trip_id,p_rider);
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended(o.id::text,790));
  RETURN QUERY UPDATE orders SET rider_id=p_rider
   WHERE id=p_order AND order_awaits_rider(status,accepted_at) AND rider_id IS NULL RETURNING *;
 END IF;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n>0 THEN PERFORM record_admin_order_action(o.id,o.trip_id,'assign_rider',NULL,p_rider::text,NULL,p_admin_email); END IF;
END $function$
;
REVOKE ALL ON FUNCTION public.admin_assign_order_rider(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_order_rider(uuid,uuid,text) TO service_role;

-- 113 with early dispatch: accepted orders count as waiting for a rider, and
-- out_of_offers starts once the widest ring has gone a full window with no
-- taker (the first repeat, dispatch_attempts beyond the number of rings).
CREATE OR REPLACE FUNCTION public.admin_dispatch_board(p_out_of_offers boolean DEFAULT false,p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
 RETURNS TABLE(scope_id uuid,trip_id uuid,order_ids uuid[],assign_order_id uuid,legs integer,statuses text[],store_names text[],
  rider_id uuid,rider_name text,placed_at timestamptz,total numeric,dispatch_radius_m integer,dispatch_attempts integer,
  dispatch_broadcast_at timestamptz,awaiting_rider boolean,out_of_offers boolean,total_count bigint)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 WITH cfg AS (SELECT * FROM dispatch_config()),
 live AS (
  SELECT coalesce(o.trip_id,o.id) AS scope,o.* FROM orders o
  WHERE coalesce(o.trip_id,o.id) IN(SELECT coalesce(trip_id,id) FROM orders WHERE status IN('placed','packed','out_for_delivery'))
   AND o.status<>'cancelled'
 ), g AS (
  SELECT l.scope,max(l.trip_id::text)::uuid AS trip_id,array_agg(l.id ORDER BY l.id) AS order_ids,
   (array_agg(l.id ORDER BY l.id) FILTER(WHERE order_awaits_rider(l.status,l.accepted_at) AND l.rider_id IS NULL))[1] AS assign_order_id,
   count(*)::integer AS legs,array_agg(l.status ORDER BY l.id) AS statuses,array_agg(s.name ORDER BY l.id) AS store_names,
   max(l.rider_id::text)::uuid AS rider_id,min(l.placed_at) AS placed_at,sum(l.total) AS total,
   max(l.dispatch_radius_m) AS dispatch_radius_m,max(l.dispatch_attempts) AS dispatch_attempts,max(l.dispatch_broadcast_at) AS dispatch_broadcast_at,
   bool_or(order_awaits_rider(l.status,l.accepted_at) AND l.rider_id IS NULL) AND NOT bool_or(l.rider_id IS NOT NULL) AS awaiting_rider
  FROM live l JOIN stores s ON s.id=l.store_id GROUP BY l.scope
 ), b AS (
  SELECT g.*,(g.awaiting_rider AND g.dispatch_broadcast_at IS NOT NULL
   AND coalesce(g.dispatch_radius_m,0)>=cfg.steps[cardinality(cfg.steps)]
   AND (g.dispatch_attempts>cardinality(cfg.steps) OR g.dispatch_broadcast_at<now()-make_interval(secs=>cfg.step_seconds))) AS out_of_offers
  FROM g CROSS JOIN cfg
 )
 SELECT b.scope,b.trip_id,b.order_ids,b.assign_order_id,b.legs,b.statuses,b.store_names,b.rider_id,r.name,b.placed_at,b.total,
  b.dispatch_radius_m,b.dispatch_attempts,b.dispatch_broadcast_at,b.awaiting_rider,b.out_of_offers,count(*) OVER()
 FROM b LEFT JOIN riders r ON r.user_id=b.rider_id
 WHERE NOT coalesce(p_out_of_offers,false) OR b.out_of_offers
 ORDER BY b.out_of_offers DESC,b.awaiting_rider DESC,b.placed_at,b.scope
 LIMIT least(greatest(coalesce(p_limit,50),1),200) OFFSET greatest(coalesce(p_offset,0),0);
$function$
;
REVOKE ALL ON FUNCTION public.admin_dispatch_board(boolean,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dispatch_board(boolean,integer,integer) TO service_role;

-- 118 + noRiderFound: orders whose search went past the widest ring, for the
-- admin bell and sidebar badge (minutes after accept, not 20 after placing).
CREATE OR REPLACE FUNCTION public.admin_attention_counts(p_now timestamptz default now(), p_stuck_minutes integer default 20) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'pendingStoreApplications', (select count(*) from store_onboarding_drafts d join users u on u.id = d.user_id
      where d.submitted_at is not null and not coalesce(u.is_rejected, false)),
    'pendingRiderApplications', (select count(*) from rider_onboarding_drafts d join users u on u.id = d.user_id
      where d.submitted_at is not null and not coalesce(u.is_rejected, false)),
    'pendingProducts', (select count(*) from products where approval_status = 'pending' or pending_image_url is not null),
    'refundsNeedingAction', (select count(distinct coalesce(trip_id,id)) from orders where refund_status in ('failed','manual_required')),
    'openSupportTickets', (select count(*) from support_tickets where status = 'open'),
    'stuckOrders', (select count(*) from orders where rider_id is null and (
      (status = 'placed' and placed_at < p_now - make_interval(mins => greatest(p_stuck_minutes, 1)))
      or (status = 'packed' and coalesce(packed_at, placed_at) < p_now - make_interval(mins => greatest(p_stuck_minutes, 1))))),
    'noRiderFound', (select count(*) from admin_dispatch_board(true, 200, 0))
  );
$$;
REVOKE ALL ON FUNCTION public.admin_attention_counts(timestamptz,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_attention_counts(timestamptz,integer) TO service_role;

CREATE INDEX IF NOT EXISTS orders_awaiting_rider_dispatch_idx ON public.orders(dispatch_broadcast_at NULLS FIRST,id)
 WHERE rider_id IS NULL AND status IN('placed','packed');

NOTIFY pgrst,'reload schema';
COMMIT;
