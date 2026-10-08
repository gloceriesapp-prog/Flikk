-- Rider operations. Requires 001..112.
-- 1. Admin-configurable dispatch (delivery_settings):
--    dispatch_radius_steps_m   the expanding offer rings in metres (was the
--                              hard-coded 3000/5000/8000). Read sorted and
--                              de-duplicated, so the admin order never matters.
--    dispatch_step_seconds     how long one ring is offered before the worker
--                              widens to the next (was 45 s).
--    max_active_trips_per_rider  concurrent live trips (a multi-store trip or a
--                              single order counts once) one rider may hold.
--                              NULL = no limit (the previous behaviour).
--    advance_dispatch_offers (latest: 075) reads the rings and step from the
--    row; orders.dispatch_attempts counts how many rings each order was offered.
--    The riderDispatch scheduled job runs every 10 s so short steps are honoured.
-- 2. Rider capacity, enforced everywhere a rider is put on an order:
--    rider_active_trip_count   live scopes (placed/packed/out_for_delivery) held.
--    enforce_rider_capacity    BEFORE UPDATE OF rider_id trigger on orders, so
--                              accept, assign_trip_rider, admin assign and
--                              admin reassign all refuse (P0429) under a
--                              per-rider advisory lock (hashtextextended(rider,791),
--                              taken after the trip lock 790 every path holds).
--    accept_dispatch_offer (latest: 107) answers RIDER_AT_CAPACITY instead of
--    raising, rider_dispatch_offers (latest: 107) shows no offers to a rider at
--    capacity, and nearby_dispatchable_riders filters the push audience.
-- 3. admin_dispatch_board: live trips/orders with rider, ring and attempts, and
--    whether every ring is exhausted with no rider ("out of offers").
-- 4. admin_rider_earning_weeks: per-week (Monday, IST) rider earning totals for
--    the admin earnings ledger, aggregated server-side.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.delivery_settings
 ADD COLUMN IF NOT EXISTS dispatch_radius_steps_m integer[] NOT NULL DEFAULT '{3000,5000,8000}',
 ADD COLUMN IF NOT EXISTS dispatch_step_seconds integer NOT NULL DEFAULT 45,
 ADD COLUMN IF NOT EXISTS max_active_trips_per_rider integer;
ALTER TABLE public.delivery_settings DROP CONSTRAINT IF EXISTS delivery_settings_dispatch_check;
ALTER TABLE public.delivery_settings ADD CONSTRAINT delivery_settings_dispatch_check CHECK(
 cardinality(dispatch_radius_steps_m) BETWEEN 1 AND 6
 AND array_ndims(dispatch_radius_steps_m)=1
 AND array_position(dispatch_radius_steps_m,NULL) IS NULL
 AND 500<=ALL(dispatch_radius_steps_m) AND 50000>=ALL(dispatch_radius_steps_m)
 AND dispatch_step_seconds BETWEEN 10 AND 600
 AND (max_active_trips_per_rider IS NULL OR max_active_trips_per_rider BETWEEN 1 AND 20));

-- The riderDispatch job ran every 60 s, so a 45 s ring really lasted about a
-- minute. It now polls every 10 s (the smallest allowed step); each pass is
-- one indexed advance_dispatch_offers call that only touches due orders.
UPDATE public.scheduled_work SET interval_seconds=10,next_run_at=least(next_run_at,now()+interval '10 seconds')
 WHERE name='riderDispatch' AND interval_seconds>10;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_attempts integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS rider_earnings_admin_ledger_idx ON public.rider_earnings(earned_at DESC,id DESC);

-- Rings sorted ascending, falling back to the old defaults if unreadable.
CREATE OR REPLACE FUNCTION public.dispatch_config()
 RETURNS TABLE(steps integer[],step_seconds integer,max_trips integer)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT coalesce((SELECT array_agg(DISTINCT x ORDER BY x) FROM unnest(d.dispatch_radius_steps_m) x WHERE x>0),'{3000,5000,8000}'::integer[]),
  coalesce(d.dispatch_step_seconds,45),d.max_active_trips_per_rider
 FROM (SELECT 1) one LEFT JOIN LATERAL(SELECT * FROM delivery_settings LIMIT 1) d ON true;
$function$
;
REVOKE ALL ON FUNCTION public.dispatch_config() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_config() TO service_role;

CREATE OR REPLACE FUNCTION public.advance_dispatch_offers(p_limit integer DEFAULT 100,p_order uuid DEFAULT NULL)
RETURNS TABLE(id uuid,store_id uuid,store_name text,lat double precision,lng double precision,radius_m integer)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH cfg AS (SELECT * FROM public.dispatch_config()
 ), due AS (
  SELECT o.id FROM public.orders o JOIN public.stores s ON s.id=o.store_id CROSS JOIN cfg
  WHERE o.status='packed' AND o.rider_id IS NULL
   AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
   AND (p_order IS NULL OR o.id=p_order)
   AND (o.dispatch_broadcast_at IS NULL OR (p_order IS NULL AND o.dispatch_broadcast_at<now()-make_interval(secs=>cfg.step_seconds)
    AND coalesce(o.dispatch_radius_m,cfg.steps[1])<cfg.steps[cardinality(cfg.steps)]))
  ORDER BY o.dispatch_broadcast_at NULLS FIRST,o.id LIMIT least(greatest(p_limit,1),100) FOR UPDATE OF o SKIP LOCKED
 ), advanced AS (
 UPDATE public.orders o SET dispatch_radius_m=CASE WHEN o.dispatch_broadcast_at IS NULL THEN cfg.steps[1]
   ELSE (SELECT min(x) FROM unnest(cfg.steps) x WHERE x>coalesce(o.dispatch_radius_m,0)) END,
  dispatch_broadcast_at=now(),dispatch_attempts=o.dispatch_attempts+1
 FROM due,cfg WHERE o.id=due.id RETURNING o.id,o.store_id,o.dispatch_radius_m
 ) SELECT a.id,a.store_id,s.name,s.lat,s.lng,a.dispatch_radius_m FROM advanced a JOIN public.stores s ON s.id=a.store_id;
$$;
REVOKE ALL ON FUNCTION public.advance_dispatch_offers(integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.advance_dispatch_offers(integer,uuid) TO service_role;

-- Live trips (a single order is its own scope) held by p_rider, not counting p_scope.
CREATE OR REPLACE FUNCTION public.rider_active_trip_count(p_rider uuid,p_scope uuid DEFAULT NULL)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT count(DISTINCT coalesce(trip_id,id))::integer FROM orders
 WHERE rider_id=p_rider AND status IN('placed','packed','out_for_delivery')
  AND coalesce(trip_id,id) IS DISTINCT FROM p_scope;
$function$
;
REVOKE ALL ON FUNCTION public.rider_active_trip_count(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rider_active_trip_count(uuid,uuid) TO service_role;

-- True when taking p_scope would exceed the limit. Serializes per rider so two
-- concurrent assignments of one rider cannot both pass the count.
CREATE OR REPLACE FUNCTION public.rider_capacity_exceeded(p_rider uuid,p_scope uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE cap integer;
BEGIN
 SELECT max_trips INTO cap FROM dispatch_config();
 IF cap IS NULL OR p_rider IS NULL THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_rider::text,791));
 RETURN rider_active_trip_count(p_rider,p_scope)>=cap;
END $function$
;
REVOKE ALL ON FUNCTION public.rider_capacity_exceeded(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rider_capacity_exceeded(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_rider_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NEW.rider_id IS NULL OR NEW.rider_id IS NOT DISTINCT FROM OLD.rider_id
  OR NEW.status NOT IN('placed','packed','out_for_delivery') THEN RETURN NEW; END IF;
 IF rider_capacity_exceeded(NEW.rider_id,coalesce(NEW.trip_id,NEW.id)) THEN
  RAISE EXCEPTION USING errcode='P0429',message='Rider already has the maximum number of active deliveries'; END IF;
 RETURN NEW;
END $function$
;
REVOKE ALL ON FUNCTION public.enforce_rider_capacity() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_rider_capacity() TO service_role;
DROP TRIGGER IF EXISTS enforce_rider_capacity ON public.orders;
CREATE TRIGGER enforce_rider_capacity BEFORE UPDATE OF rider_id ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.enforce_rider_capacity();

-- 107 + no offers while the rider is at capacity.
CREATE OR REPLACE FUNCTION public.rider_dispatch_offers(p_rider uuid)
 RETURNS TABLE(order_id uuid, distance_m double precision)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with me as (
    select r.current_lat as lat, r.current_lng as lng
    from riders r
    where r.user_id = p_rider
      and r.is_active
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
    where o.status = 'packed'
      and o.rider_id is null
      and o.dispatch_broadcast_at is not null
      and s.lat is not null
      and s.lng is not null
  )
  select id as order_id, distance_m
  from distances
  where distance_m <= radius_m
  order by distance_m asc;
$function$
;
REVOKE ALL ON FUNCTION public.rider_dispatch_offers(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rider_dispatch_offers(uuid) TO service_role;

-- Push audience: nearby_online_riders (latest: 110) minus riders at capacity.
CREATE OR REPLACE FUNCTION public.nearby_dispatchable_riders(p_store_lat double precision,p_store_lng double precision,p_radius_m double precision)
 RETURNS TABLE(rider_user_id uuid, distance_m double precision)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT n.rider_user_id,n.distance_m FROM nearby_online_riders(p_store_lat,p_store_lng,p_radius_m) n
 WHERE coalesce(rider_active_trip_count(n.rider_user_id) < (SELECT max_trips FROM dispatch_config()), true)
 ORDER BY n.distance_m;
$function$
;
REVOKE ALL ON FUNCTION public.nearby_dispatchable_riders(double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_dispatchable_riders(double precision,double precision,double precision) TO service_role;

-- 107 + RIDER_AT_CAPACITY (checked under the trip lock, then the rider lock).
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
 IF o.status<>'packed' OR o.rider_id IS NOT NULL OR EXISTS(SELECT 1 FROM orders WHERE coalesce(trip_id,id)=scope
  AND status<>'cancelled' AND rider_id IS NOT NULL AND rider_id<>p_rider) THEN
  RETURN jsonb_build_object('accepted',false,'error','ALREADY_TAKEN'); END IF;
 IF o.dispatch_broadcast_at IS NULL THEN RETURN jsonb_build_object('accepted',false,'error','NOT_OFFERED'); END IF;
 SELECT * INTO r FROM riders WHERE user_id=p_rider;
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
END $function$
;
REVOKE ALL ON FUNCTION public.accept_dispatch_offer(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_dispatch_offer(uuid,uuid) TO service_role;

-- One row per live scope (trip, or single order). out_of_offers: a packed leg
-- still has no rider, its widest configured ring was offered and that ring's
-- window has passed, so only manual assignment will move it.
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
   (array_agg(l.id ORDER BY l.id) FILTER(WHERE l.status='packed' AND l.rider_id IS NULL))[1] AS assign_order_id,
   count(*)::integer AS legs,array_agg(l.status ORDER BY l.id) AS statuses,array_agg(s.name ORDER BY l.id) AS store_names,
   max(l.rider_id::text)::uuid AS rider_id,min(l.placed_at) AS placed_at,sum(l.total) AS total,
   max(l.dispatch_radius_m) AS dispatch_radius_m,max(l.dispatch_attempts) AS dispatch_attempts,max(l.dispatch_broadcast_at) AS dispatch_broadcast_at,
   bool_or(l.status='packed' AND l.rider_id IS NULL) AND NOT bool_or(l.rider_id IS NOT NULL) AS awaiting_rider
  FROM live l JOIN stores s ON s.id=l.store_id GROUP BY l.scope
 ), b AS (
  SELECT g.*,(g.awaiting_rider AND g.dispatch_broadcast_at IS NOT NULL
   AND coalesce(g.dispatch_radius_m,0)>=cfg.steps[cardinality(cfg.steps)]
   AND g.dispatch_broadcast_at<now()-make_interval(secs=>cfg.step_seconds)) AS out_of_offers
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

-- Weekly (Monday-start, IST) totals of rider_earnings for the admin ledger.
-- p_rider NULL = every rider. Bounded to 400 days per call.
CREATE OR REPLACE FUNCTION public.admin_rider_earning_weeks(p_rider uuid,p_from timestamptz,p_until timestamptz)
 RETURNS TABLE(week_start date,deliveries bigint,total numeric,base numeric,extra numeric,paid numeric,unpaid numeric)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT date_trunc('week',e.earned_at AT TIME ZONE 'Asia/Kolkata')::date,count(*),sum(e.amount),
  sum(coalesce(e.base_amount,e.amount-coalesce(e.extra_stop_amount,0))),sum(coalesce(e.extra_stop_amount,0)),
  coalesce(sum(e.amount) FILTER(WHERE e.paid_at IS NOT NULL),0),coalesce(sum(e.amount) FILTER(WHERE e.paid_at IS NULL),0)
 FROM rider_earnings e
 WHERE (p_rider IS NULL OR e.rider_id=p_rider) AND e.earned_at>=p_from AND e.earned_at<p_until
  AND p_until>p_from AND p_until<=p_from+interval '400 days'
 GROUP BY 1 ORDER BY 1 DESC;
$function$
;
REVOKE ALL ON FUNCTION public.admin_rider_earning_weeks(uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rider_earning_weeks(uuid,timestamptz,timestamptz) TO service_role;

COMMIT;
