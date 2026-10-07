-- Delivery reach and distance-based fees become admin settings. Requires 001..103.
-- 1. delivery_settings gains:
--    - default_delivery_radius_km: reach for a store without its own
--      stores.delivery_radius_km (was a literal 12 in SQL and TypeScript).
--    - road_distance_factor: straight-line km x factor = estimated road km.
--      Rivers and backwaters make straight-line distance far too optimistic.
--    - delivery_fee_tiers: [{"up_to_km":n,"fee":rupees}, ...] by road km; a
--      distance beyond the last tier pays the last tier's fee. An empty list
--      falls back to flat_delivery_fee.
--    - max_store_spread_km: a multi-store cart is refused when two of its
--      shops are further apart (road km) than this. 0 turns the rule off.
--    - rider_base_payout / rider_extra_stop_payout: read and written by the
--      admin Settings page but never created by a migration, so every save
--      there failed. Display/config only; payout code does not read them yet.
-- 2. checkout_assert_store (order insert guard) and nearby_customer_stores
--    (discovery) use the settings and road km instead of the literal 12 and
--    straight-line km. Bodies are otherwise unchanged from 063 and 097;
--    signatures, SECURITY DEFINER, search_path and grants are unchanged.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS default_delivery_radius_km numeric(5,2) NOT NULL DEFAULT 12
    CHECK (default_delivery_radius_km >= 0.5 AND default_delivery_radius_km <= 50),
  ADD COLUMN IF NOT EXISTS road_distance_factor numeric(4,2) NOT NULL DEFAULT 1.4
    CHECK (road_distance_factor >= 1 AND road_distance_factor <= 3),
  ADD COLUMN IF NOT EXISTS delivery_fee_tiers jsonb NOT NULL
    DEFAULT '[{"up_to_km":2,"fee":17},{"up_to_km":4,"fee":26},{"up_to_km":12,"fee":32}]'::jsonb
    CHECK (jsonb_typeof(delivery_fee_tiers) = 'array' AND jsonb_array_length(delivery_fee_tiers) <= 10),
  ADD COLUMN IF NOT EXISTS max_store_spread_km numeric(5,2) NOT NULL DEFAULT 2
    CHECK (max_store_spread_km >= 0 AND max_store_spread_km <= 50),
  ADD COLUMN IF NOT EXISTS rider_base_payout numeric(10,2) NOT NULL DEFAULT 0
    CHECK (rider_base_payout >= 0),
  ADD COLUMN IF NOT EXISTS rider_extra_stop_payout numeric(10,2) NOT NULL DEFAULT 0
    CHECK (rider_extra_stop_payout >= 0);

-- Estimated road km between two pins: great-circle km x road_distance_factor.
-- The one distance rule shared by checkout, discovery and the backend.
CREATE OR REPLACE FUNCTION public.delivery_road_km(
 lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
 SELECT 2*6371.0*asin(sqrt(least(1.0,greatest(0.0,
   power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2)))))
  * coalesce((SELECT road_distance_factor::double precision FROM public.delivery_settings LIMIT 1), 1.4)
$$;
REVOKE ALL ON FUNCTION public.delivery_road_km(double precision,double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delivery_road_km(double precision,double precision,double precision,double precision) TO service_role;

CREATE OR REPLACE FUNCTION public.default_delivery_radius_km()
RETURNS double precision LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
 SELECT coalesce((SELECT default_delivery_radius_km::double precision FROM public.delivery_settings LIMIT 1), 12)
$$;
REVOKE ALL ON FUNCTION public.default_delivery_radius_km() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.default_delivery_radius_km() TO service_role;

-- 063's guard, with the settings-driven radius and road km.
create or replace function public.checkout_assert_store(customer uuid, address_id uuid, store_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.addresses; s public.stores; minute integer; opens integer; closes integer; radius double precision; km double precision; current_time_at timestamptz;
begin
  current_time_at := checkout_clock();
  minute := extract(hour from current_time_at at time zone 'Asia/Kolkata')::integer * 60
    + extract(minute from current_time_at at time zone 'Asia/Kolkata')::integer;
  if minute < 360 or minute >= 1350 then raise exception using errcode='P1001', message='Ordering is closed until 6:00 AM IST'; end if;
  select * into a from public.addresses where id=address_id and user_id=customer and deleted_at is null for share;
  if not found or a.latitude is null or a.longitude is null or not(a.latitude between -90 and 90 and a.longitude between -180 and 180) then
    raise exception using errcode='P1001', message='Choose a saved address with a valid map pin'; end if;
  select * into s from public.stores where id=store_id for share;
  if not found or not s.is_active then raise exception using errcode='P1001', message='Shop closed'; end if;
  perform 1 from public.zones where id=a.zone_id and id=s.zone_id and is_active for share;
  if not found then raise exception using errcode='P1001', message='Shop cannot deliver to this area'; end if;
  if nullif(trim(s.open_time),'') is not null or nullif(trim(s.close_time),'') is not null then
    opens := checkout_time_minutes(s.open_time); closes := checkout_time_minutes(s.close_time);
    if opens is null or closes is null or (opens < closes and not(minute >= opens and minute < closes))
      or (opens > closes and not(minute >= opens or minute < closes)) then
      raise exception using errcode='P1001', message='Shop closed'; end if;
  end if;
  radius := coalesce(s.delivery_radius_km, default_delivery_radius_km());
  if s.lat is null or s.lng is null or not(s.lat between -90 and 90 and s.lng between -180 and 180) or radius <= 0 or radius::text in ('NaN','Infinity','-Infinity') then
    raise exception using errcode='P1001', message='Delivery from this shop is unavailable'; end if;
  km := delivery_road_km(a.latitude, a.longitude, s.lat, s.lng);
  if km > radius then raise exception using errcode='P1001', message='Shop cannot deliver to this address'; end if;
end $$;

-- 097's discovery, with the settings-driven radius; distance_km is road km.
-- The bounding box is sized from road reach, which is never smaller than the
-- straight-line reach, so no in-range store is cut.
CREATE OR REPLACE FUNCTION public.nearby_customer_stores(
 p_lat double precision, p_lng double precision, p_zone uuid DEFAULT NULL,
 p_limit integer DEFAULT 5, p_max_km double precision DEFAULT NULL)
RETURNS TABLE(store jsonb, distance_km double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE z uuid; reach double precision; angle double precision; d double precision;
 dlat double precision; dlng double precision; lowlat double precision; highlat double precision;
BEGIN
 IF p_lat IS NULL OR p_lng IS NULL OR NOT (p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180)
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20
    OR (p_max_km IS NOT NULL AND NOT (p_max_km BETWEEN 0.1 AND 50)) THEN
   RAISE EXCEPTION 'Invalid discovery parameters' USING ERRCODE='22023';
 END IF;
 z := p_zone;
 IF z IS NULL THEN SELECT id INTO z FROM public.zones WHERE is_active ORDER BY id LIMIT 1; END IF;
 IF z IS NULL THEN RETURN; END IF;
 d := default_delivery_radius_km();
 SELECT coalesce(s.delivery_radius_km,d) INTO reach FROM public.stores s
 WHERE s.zone_id=z AND s.is_active AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
 ORDER BY coalesce(s.delivery_radius_km,d) DESC LIMIT 1;
 IF reach IS NULL OR reach < 0 THEN RETURN; END IF;
 reach := least(reach,coalesce(p_max_km,reach));
 angle := least(pi(),reach / 6371.0);
 dlat := degrees(angle)+1e-9; lowlat:=greatest(-90,p_lat-dlat); highlat:=least(90,p_lat+dlat);
 dlng := CASE WHEN lowlat<=-90 OR highlat>=90 THEN 180
              ELSE degrees(asin(least(1,sin(angle)/cos(radians(p_lat))))) END;
 dlng:=least(180,dlng+1e-9);
 RETURN QUERY
 WITH candidates AS MATERIALIZED (
  SELECT s.*, delivery_road_km(p_lat,p_lng,s.lat,s.lng) AS km
  FROM public.stores s WHERE s.zone_id=z AND s.is_active
   AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
   AND (
    point(s.lng,s.lat) <@ box(point(greatest(-180,p_lng-dlng),lowlat),point(least(180,p_lng+dlng),highlat))
    OR (p_lng-dlng < -180 AND point(s.lng,s.lat) <@ box(point(p_lng-dlng+360,lowlat),point(180,highlat)))
    OR (p_lng+dlng > 180 AND point(s.lng,s.lat) <@ box(point(-180,lowlat),point(p_lng+dlng-360,highlat)))
   )
 )
 SELECT (SELECT jsonb_object_agg(k,v) FROM jsonb_each(to_jsonb(c)) AS fields(k,v)
   WHERE k=ANY(ARRAY['id','zone_id','name','category','rating','avg_prep_minutes','is_active',
     'open_time','close_time','lat','lng','delivery_radius_km','photo_url','address_line','manual_address',
     'city','district','fssai_number','created_at'])),
  c.km FROM candidates c
 WHERE c.km <= least(coalesce(c.delivery_radius_km,d),coalesce(p_max_km,coalesce(c.delivery_radius_km,d)))
 ORDER BY c.km,c.id LIMIT p_limit;
END $$;
REVOKE ALL ON FUNCTION public.nearby_customer_stores(double precision,double precision,uuid,integer,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_customer_stores(double precision,double precision,uuid,integer,double precision) TO service_role;

COMMIT;
