-- Google Play reviewer login for the rider app.
--
-- Play's reviewer signs in with a LOGIN_TEST_OTPS number (fixed code, no
-- SMS) and must land on an approved rider account, or review stops at
-- onboarding (ID documents, admin approval). That account is real data in
-- production, so it is fenced off from real work:
--   * riders.is_review_account marks it;
--   * nearby_online_riders (push audience), rider_dispatch_offers (the
--     offers list) and accept_dispatch_offer skip or refuse it, so it can
--     go online and see the full app but never receives or takes an order,
--     and so never earns, collects cash or appears in a payout.
--
-- ensure_play_review_rider(phone) creates or repairs the account and is
-- safe to run again (e.g. after an admin suspends or rejects it by mistake).
-- The phone must also be listed in Railway's LOGIN_TEST_OTPS.

ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS is_review_account boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.nearby_online_riders(p_store_lat double precision, p_store_lng double precision, p_radius_m double precision)
 RETURNS TABLE(rider_user_id uuid, distance_m double precision)
 LANGUAGE sql
 STABLE
AS $function$
  with distances as (
    select
      r.user_id,
      6371000 * acos(least(1, greatest(-1,
        cos(radians(p_store_lat)) * cos(radians(r.current_lat)) * cos(radians(r.current_lng) - radians(p_store_lng))
        + sin(radians(p_store_lat)) * sin(radians(r.current_lat))
      ))) as distance_m
    from riders r
    where r.status = 'online'
      and r.is_active
      and not r.is_review_account
      and r.current_lat is not null
      and r.current_lng is not null
      and r.last_location_update is not null
      and r.last_location_update > now() - interval '3 minutes'
  )
  select user_id as rider_user_id, distance_m
  from distances
  where distance_m <= p_radius_m
  order by distance_m asc;
$function$;

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
$function$;

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

-- Creates or repairs the approved review rider for a canonical +91 number.
-- The auth user is created on first sign-in under the same id
-- (loginOtp.preparePassword recreates a missing auth user).
CREATE OR REPLACE FUNCTION public.ensure_play_review_rider(p_phone text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE uid uuid;
BEGIN
 IF p_phone !~ '^\+91[6-9][0-9]{9}$' THEN RAISE EXCEPTION 'Phone must be +91 followed by a 10-digit mobile number'; END IF;
 SELECT id INTO uid FROM users WHERE phone=p_phone;
 IF uid IS NULL THEN
  INSERT INTO users (phone, name, role, is_approved, account_type)
  VALUES (p_phone, 'Play Review Rider', 'rider', true, 'rider') RETURNING id INTO uid;
 ELSE
  IF EXISTS (SELECT 1 FROM riders WHERE user_id=uid AND NOT is_review_account) THEN
   RAISE EXCEPTION 'This number belongs to a real rider; use another number';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE id=uid AND role IN ('admin','store_owner')) THEN
   RAISE EXCEPTION 'This number belongs to an admin or partner; use another number';
  END IF;
  UPDATE users SET role='rider', is_approved=true, is_rejected=false, account_type='rider',
   name=coalesce(name,'Play Review Rider') WHERE id=uid;
 END IF;
 INSERT INTO riders (user_id, name, phone, vehicle_type, vehicle_number, is_review_account)
 VALUES (uid, 'Play Review Rider', p_phone, 'scooter', 'KA00RV0000', true)
 ON CONFLICT (user_id) DO UPDATE SET is_review_account=true, is_active=true,
  suspended_reason=null, suspended_at=null, suspended_by=null;
 RETURN uid;
END $function$;
REVOKE ALL ON FUNCTION public.ensure_play_review_rider(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_play_review_rider(text) TO service_role;

-- The production reviewer account (number listed in LOGIN_TEST_OTPS).
SELECT public.ensure_play_review_rider('+919000000102');
