-- Rider dispatch authorization and multi-store trip integrity. Requires 001..104.
-- 1. rider_dispatch_offers(rider): the rider's open offers, measured from the
--    rider's stored position (PATCH /rider/status) and capped by each order's
--    own dispatch_radius_m. Only an online rider with a fresh position (same
--    3-minute window as nearby_online_riders) sees offers. Replaces the
--    client-supplied lat/lng/radius lookup (nearby_dispatch_offers) in the API.
-- 2. accept_dispatch_offer(order, rider): the rider accept, as one
--    transaction under the trip advisory lock (key hashtextextended(scope,790),
--    as in 089/103). The order must be packed, unassigned and broadcast; the
--    rider must be online and inside the order's current dispatch radius. A
--    trip whose live legs already belong to another rider is refused, and every
--    unassigned placed/packed leg of the trip is claimed in the same statement,
--    so two riders can never split one trip.
-- 3. assign_trip_rider(trip, rider): admin trip assignment under the same lock;
--    refuses when a live leg already has a different rider.
-- 4. guard_checkout_order (latest: 103): a trip leg cannot move to
--    out_for_delivery while another leg of the same trip is still 'placed'.
--    Statuses only move forward, so the unlocked sibling read can only cause a
--    false refusal, never a false pass.
-- 5. fail_assigned_trip (latest: 103): after pickup the rider can fail the
--    whole trip even if a leg was never picked up. Legs still placed/packed are
--    cancelled (stock released by finish_checkout_stock) and picked-up legs are
--    failed, so the trip becomes 'failed' and approve_failed_trip_refund can run.
-- 6. record_atomic_rider_earning / record_delivered_popularity (latest: 086)
--    treat a cancelled leg as terminal, so a trip with a cancelled leg can
--    still finalize (status and rider earning).
-- 7. complete_verified_delivery (latest: 089) marks a replay ('replayed':true)
--    so the API sends the store "earned" push only once per delivery.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

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
 -- One rider owns the whole trip: every unassigned live leg is claimed here.
 UPDATE orders SET rider_id=p_rider WHERE coalesce(trip_id,id)=scope AND rider_id IS NULL AND status IN('placed','packed');
 RETURN jsonb_build_object('accepted',true,'replayed',false,'order_id',o.id,'trip_id',o.trip_id);
END $function$
;
REVOKE ALL ON FUNCTION public.accept_dispatch_offer(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_dispatch_offer(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.assign_trip_rider(p_trip uuid, p_rider uuid)
 RETURNS SETOF orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_trip::text,790));
 PERFORM 1 FROM orders WHERE trip_id=p_trip ORDER BY id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM orders WHERE trip_id=p_trip AND status<>'cancelled' AND rider_id IS NOT NULL AND rider_id<>p_rider) THEN
  RAISE EXCEPTION USING errcode='P0409', message='Trip already has another rider'; END IF;
 RETURN QUERY UPDATE orders SET rider_id=p_rider
  WHERE trip_id=p_trip AND rider_id IS NULL AND status IN('placed','packed') RETURNING *;
END $function$
;
REVOKE ALL ON FUNCTION public.assign_trip_rider(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_trip_rider(uuid,uuid) TO service_role;

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
    -- A picked-up leg blocks trip cancellation, so no leg may leave while a
    -- sibling shop has not packed yet.
    if new.status='out_for_delivery' and old.status is distinct from new.status and new.trip_id is not null
      and exists(select 1 from orders where trip_id=new.trip_id and id<>new.id and status='placed') then
      raise exception using errcode='P0409', message='Another shop in this trip has not packed yet'; end if;
  end if;
  return new;
end $function$
;
REVOKE ALL ON FUNCTION public.guard_checkout_order() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fail_assigned_trip(p_trip uuid, p_rider uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE t trips; cancelled_legs integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_trip::text,790));
 SELECT * INTO t FROM trips WHERE id=p_trip FOR UPDATE;
 -- Post-pickup only: picked-up legs must all be this rider's; legs never
 -- picked up may be unassigned or this rider's.
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=p_trip AND rider_id=p_rider)
 OR NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=p_trip AND status IN('out_for_delivery','delivered','failed'))
 OR EXISTS(SELECT 1 FROM orders WHERE trip_id=p_trip AND(
   (status IN('out_for_delivery','delivered','failed') AND rider_id IS DISTINCT FROM p_rider)
   OR (status IN('placed','packed') AND rider_id IS NOT NULL AND rider_id<>p_rider))) THEN
  RAISE EXCEPTION 'Trip is not ready for a delivery failure'; END IF;
 IF coalesce(length(p_reason),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Failure reason required'; END IF;
 PERFORM 1 FROM orders WHERE trip_id=p_trip ORDER BY id FOR UPDATE;
 -- Same lock order as cancel_customer_trip, payment settlement and expiry.
 PERFORM 1 FROM products WHERE id IN(SELECT product_id FROM inventory_reservations
  WHERE order_id IN(SELECT id FROM orders WHERE trip_id=p_trip AND status IN('placed','packed')) AND state IN('held','committed')) ORDER BY id FOR UPDATE;
 -- Cancel never-collected legs first so the failed legs below finalize the trip.
 UPDATE orders SET status='cancelled',cancel_reason=p_reason WHERE trip_id=p_trip AND status IN('placed','packed');
 GET DIAGNOSTICS cancelled_legs=ROW_COUNT;
 UPDATE orders SET status='failed',cancel_reason=p_reason WHERE trip_id=p_trip AND status='out_for_delivery';
 RETURN jsonb_build_object('trip_id',p_trip,'status','failed','cancelled_legs',cancelled_legs,
  'refund_review_required',t.provider_payment_id IS NOT NULL);
END $function$
;
REVOKE ALL ON FUNCTION public.fail_assigned_trip(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fail_assigned_trip(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_atomic_rider_earning()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE fee numeric;
BEGIN
 IF NEW.status NOT IN('delivered','failed') OR OLD.status=NEW.status THEN RETURN NEW; END IF;
 IF NEW.rider_id IS NULL THEN RAISE EXCEPTION 'Completion requires assigned rider'; END IF;
 IF NEW.trip_id IS NULL THEN
  INSERT INTO rider_earnings(rider_id,order_id,amount) VALUES(NEW.rider_id,NEW.id,NEW.delivery_fee) ON CONFLICT DO NOTHING;
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.trip_id::text,790));
  IF NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status NOT IN('delivered','failed','cancelled')) THEN
   IF EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status<>'cancelled' AND rider_id IS DISTINCT FROM NEW.rider_id) THEN
    RAISE EXCEPTION 'Trip has inconsistent rider assignments'; END IF;
   SELECT delivery_fee INTO STRICT fee FROM trips WHERE id=NEW.trip_id;
   INSERT INTO rider_earnings(rider_id,order_id,trip_id,amount) VALUES(NEW.rider_id,NEW.id,NEW.trip_id,fee) ON CONFLICT DO NOTHING;
  END IF;
 END IF;
 RETURN NEW;
END $function$
;
REVOKE ALL ON FUNCTION public.record_atomic_rider_earning() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.record_delivered_popularity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NEW.status IN('delivered','failed') AND OLD.status IS DISTINCT FROM NEW.status THEN
  IF NEW.status='delivered' THEN
  INSERT INTO product_popularity_daily(product_id,store_id,day,quantity)
   SELECT product_id,NEW.store_id,(coalesce(NEW.delivered_at,now()) AT TIME ZONE 'Asia/Kolkata')::date,sum(quantity) FROM order_items WHERE order_id=NEW.id GROUP BY product_id
   ON CONFLICT(product_id,day) DO UPDATE SET quantity=product_popularity_daily.quantity+excluded.quantity;
  END IF;
  IF NEW.trip_id IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended(NEW.trip_id::text,790));
   IF NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status NOT IN('delivered','failed','cancelled')) THEN UPDATE trips SET status=CASE WHEN EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status='failed') THEN 'failed' ELSE 'delivered' END WHERE id=NEW.trip_id; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $function$
;
REVOKE ALL ON FUNCTION public.record_delivered_popularity() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.complete_verified_delivery(p_order uuid,p_rider uuid,p_code text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o orders; c delivery_codes; scope uuid;
BEGIN
 SELECT coalesce(trip_id,id) INTO scope FROM orders WHERE id=p_order AND rider_id=p_rider;
 IF scope IS NULL THEN RETURN jsonb_build_object('accepted',false,'error','ORDER_NOT_FOUND'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(scope::text,790));
 PERFORM id FROM orders WHERE coalesce(trip_id,id)=scope ORDER BY id FOR UPDATE;
 SELECT * INTO o FROM orders WHERE id=p_order AND rider_id=p_rider;
 IF o.status='delivered' THEN RETURN jsonb_build_object('accepted',true,'replayed',true,'order',to_jsonb(o)); END IF;
 IF o.status<>'out_for_delivery' OR EXISTS(SELECT 1 FROM orders WHERE coalesce(trip_id,id)=scope
  AND status NOT IN('delivered','cancelled','failed') AND (rider_id IS DISTINCT FROM p_rider OR status<>'out_for_delivery')) THEN
  RETURN jsonb_build_object('accepted',false,'error','ORDER_CHANGED'); END IF;
 SELECT * INTO c FROM delivery_codes WHERE scope_id=scope FOR UPDATE;
 IF NOT FOUND OR c.consumed_at IS NOT NULL OR c.expires_at<=now() THEN
  RETURN jsonb_build_object('accepted',false,'error','CODE_EXPIRED'); END IF;
 IF c.attempts>=5 THEN RETURN jsonb_build_object('accepted',false,'error','CODE_LOCKED'); END IF;
 IF p_code IS DISTINCT FROM c.code THEN
  UPDATE delivery_codes SET attempts=attempts+1 WHERE scope_id=scope;
  RETURN jsonb_build_object('accepted',false,'error','INVALID_OTP');
 END IF;
 UPDATE orders SET status='delivered',delivered_at=now()
 WHERE coalesce(trip_id,id)=scope AND status='out_for_delivery';
 UPDATE delivery_codes SET consumed_at=now() WHERE scope_id=scope;
 SELECT * INTO o FROM orders WHERE id=p_order;
 RETURN jsonb_build_object('accepted',true,'replayed',false,'order',to_jsonb(o));
END $$;
REVOKE ALL ON FUNCTION public.complete_verified_delivery(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_delivery(uuid,uuid,text) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
