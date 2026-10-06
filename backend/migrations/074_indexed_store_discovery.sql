-- Built-in PostgreSQL GiST point index: no new extension or geocoding service.
-- Bounding boxes are only a candidate filter; exact haversine distance decides
-- eligibility and ordering. Keep the 6371km spherical model used by checkout.
CREATE INDEX IF NOT EXISTS stores_location_gist ON public.stores USING gist (point(lng,lat))
 WHERE lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180;
CREATE INDEX IF NOT EXISTS stores_zone_radius_idx ON public.stores
 (zone_id, (coalesce(delivery_radius_km,12)) DESC)
 WHERE lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180;

CREATE OR REPLACE FUNCTION public.nearby_customer_stores(
 p_lat double precision, p_lng double precision, p_zone uuid DEFAULT NULL,
 p_limit integer DEFAULT 5, p_max_km double precision DEFAULT NULL)
RETURNS TABLE(store jsonb, distance_km double precision)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE z uuid; reach double precision; angle double precision;
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
 -- Index-backed largest radius, not a transfer of every store in the zone.
 SELECT coalesce(s.delivery_radius_km,12) INTO reach FROM public.stores s
 WHERE s.zone_id=z AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
 ORDER BY coalesce(s.delivery_radius_km,12) DESC LIMIT 1;
 IF reach IS NULL OR reach < 0 THEN RETURN; END IF;
 reach := least(reach,coalesce(p_max_km,reach));
 angle := least(pi(),reach / 6371.0);
 dlat := degrees(angle)+1e-9; lowlat:=greatest(-90,p_lat-dlat); highlat:=least(90,p_lat+dlat);
 dlng := CASE WHEN lowlat<=-90 OR highlat>=90 THEN 180
              ELSE degrees(asin(least(1,sin(angle)/cos(radians(p_lat))))) END;
 dlng:=least(180,dlng+1e-9);
 RETURN QUERY
 WITH candidates AS MATERIALIZED (
  SELECT s.*, 2*6371.0*asin(sqrt(least(1.0,greatest(0.0,
    power(sin(radians(s.lat-p_lat)/2),2)+cos(radians(p_lat))*cos(radians(s.lat))*power(sin(radians(s.lng-p_lng)/2),2))))) AS km
  FROM public.stores s WHERE s.zone_id=z
   AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
   AND (
    point(s.lng,s.lat) <@ box(point(greatest(-180,p_lng-dlng),lowlat),point(least(180,p_lng+dlng),highlat))
    OR (p_lng-dlng < -180 AND point(s.lng,s.lat) <@ box(point(p_lng-dlng+360,lowlat),point(180,highlat)))
    OR (p_lng+dlng > 180 AND point(s.lng,s.lat) <@ box(point(-180,lowlat),point(p_lng+dlng-360,highlat)))
   )
 )
 SELECT (SELECT jsonb_object_agg(k,v) FROM jsonb_each(to_jsonb(c)) AS fields(k,v)
   WHERE k=ANY(ARRAY['id','zone_id','name','category','rating','avg_prep_minutes','is_active',
     'open_time','close_time','lat','lng','delivery_radius_km','photo_url','address_line','city','district','fssai_number'])),
  c.km FROM candidates c
 WHERE c.km <= least(coalesce(c.delivery_radius_km,12),coalesce(p_max_km,coalesce(c.delivery_radius_km,12)))
 ORDER BY c.km,c.id LIMIT p_limit;
END $$;
REVOKE ALL ON FUNCTION public.nearby_customer_stores(double precision,double precision,uuid,integer,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_customer_stores(double precision,double precision,uuid,integer,double precision) TO service_role;
