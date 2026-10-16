BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.stores
  ADD COLUMN availability_override boolean,
  ADD COLUMN availability_override_until timestamptz,
  ADD COLUMN availability_next_change_at timestamptz;
ALTER TABLE public.stores ADD CONSTRAINT store_availability_override_pair
  CHECK ((availability_override IS NULL) = (availability_override_until IS NULL));
CREATE INDEX stores_availability_due_idx ON public.stores(availability_next_change_at,id)
  WHERE availability_next_change_at IS NOT NULL;

CREATE FUNCTION public.store_schedule_open(p_open text, p_close text, p_at timestamptz)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE o integer; c integer; m integer;
BEGIN
  IF nullif(btrim(p_open),'') IS NULL AND nullif(btrim(p_close),'') IS NULL THEN RETURN true; END IF;
  o := checkout_time_minutes(p_open); c := checkout_time_minutes(p_close);
  IF o IS NULL OR c IS NULL THEN RETURN false; END IF;
  m := extract(hour FROM p_at AT TIME ZONE 'Asia/Kolkata')::integer*60
    + extract(minute FROM p_at AT TIME ZONE 'Asia/Kolkata')::integer;
  RETURN o=c OR CASE WHEN o<c THEN m>=o AND m<c ELSE m>=o OR m<c END;
END $$;

CREATE FUNCTION public.store_next_hours_boundary(p_open text, p_close text, p_at timestamptz)
RETURNS timestamptz LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE o integer; c integer; local_day timestamp; result timestamptz;
BEGIN
  o := checkout_time_minutes(p_open); c := checkout_time_minutes(p_close);
  IF o IS NULL OR c IS NULL OR o=c THEN RETURN NULL; END IF;
  local_day := date_trunc('day',p_at AT TIME ZONE 'Asia/Kolkata');
  SELECT min(candidate) INTO result FROM (
    SELECT (local_day+make_interval(days=>d,mins=>m)) AT TIME ZONE 'Asia/Kolkata' AS candidate
    FROM generate_series(0,1) AS d CROSS JOIN unnest(ARRAY[o,c]) AS m
  ) boundaries WHERE candidate>p_at;
  RETURN result;
END $$;

CREATE FUNCTION public.store_effective_open(p_store public.stores, p_at timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_store.admin_suspended OR NOT EXISTS (
    SELECT 1 FROM users WHERE id=p_store.owner_user_id AND is_approved AND NOT partner_suspended
  ) THEN RETURN false; END IF;
  IF p_store.availability_override_until>p_at THEN RETURN p_store.availability_override; END IF;
  RETURN store_schedule_open(p_store.open_time,p_store.close_time,p_at);
END $$;

CREATE FUNCTION public.stores_apply_availability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE at_time timestamptz:=statement_timestamp(); boundary timestamptz;
BEGIN
  boundary:=store_next_hours_boundary(NEW.open_time,NEW.close_time,at_time);
  IF TG_OP='INSERT' AND NOT NEW.is_active AND NEW.availability_override IS NULL THEN
    NEW.availability_override:=false;
    NEW.availability_override_until:=coalesce(boundary,
      (date_trunc('day',at_time AT TIME ZONE 'Asia/Kolkata')+interval '1 day') AT TIME ZONE 'Asia/Kolkata');
  END IF;
  IF TG_OP='UPDATE' THEN
    -- Old clients/admin editors still PATCH is_active. Convert a manual
    -- departure from the automatic result into a bounded override.
    IF NEW.is_active IS DISTINCT FROM OLD.is_active
       AND NEW.availability_override IS NOT DISTINCT FROM OLD.availability_override
       AND NEW.availability_override_until IS NOT DISTINCT FROM OLD.availability_override_until
       AND NEW.admin_suspended IS NOT DISTINCT FROM OLD.admin_suspended
       AND NEW.is_active IS DISTINCT FROM store_effective_open(NEW,at_time) THEN
      NEW.availability_override:=NEW.is_active;
      NEW.availability_override_until:=coalesce(boundary,
        (date_trunc('day',at_time AT TIME ZONE 'Asia/Kolkata')+interval '1 day') AT TIME ZONE 'Asia/Kolkata');
    END IF;
    -- New hours take effect immediately and resume automatic operation.
    IF NEW.open_time IS DISTINCT FROM OLD.open_time OR NEW.close_time IS DISTINCT FROM OLD.close_time THEN
      NEW.availability_override:=NULL; NEW.availability_override_until:=NULL;
    END IF;
  END IF;
  IF NEW.availability_override_until<=at_time THEN
    NEW.availability_override:=NULL; NEW.availability_override_until:=NULL;
  END IF;
  NEW.is_active:=store_effective_open(NEW,at_time);
  NEW.availability_next_change_at:=least(boundary,NEW.availability_override_until);
  RETURN NEW;
END $$;
CREATE TRIGGER stores_apply_availability BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.stores_apply_availability();

CREATE FUNCTION public.partner_set_store_availability(p_store uuid,p_user uuid,p_open boolean)
RETURNS public.stores LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.stores; deadline timestamptz; at_time timestamptz:=statement_timestamp();
BEGIN
  SELECT * INTO s FROM stores WHERE id=p_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Store not found'; END IF;
  IF p_user IS NULL OR (s.owner_user_id<>p_user AND NOT EXISTS (
    SELECT 1 FROM store_memberships m JOIN users u ON u.id=m.user_id
    WHERE m.store_id=p_store AND m.user_id=p_user AND m.is_active AND u.is_approved AND NOT u.partner_suspended
  )) THEN RAISE EXCEPTION USING ERRCODE='P0403',MESSAGE='Not this store''s operator'; END IF;
  IF p_open IS TRUE AND (s.admin_suspended OR NOT EXISTS (
    SELECT 1 FROM users WHERE id=s.owner_user_id AND is_approved AND NOT partner_suspended
  )) THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='STORE_SUSPENDED'; END IF;
  IF p_open IS NOT NULL THEN
    deadline:=coalesce(store_next_hours_boundary(s.open_time,s.close_time,at_time),
      (date_trunc('day',at_time AT TIME ZONE 'Asia/Kolkata')+interval '1 day') AT TIME ZONE 'Asia/Kolkata');
  END IF;
  UPDATE stores SET availability_override=p_open,availability_override_until=deadline
    WHERE id=p_store RETURNING * INTO s;
  RETURN s;
END $$;

-- Indexed due rows, bounded batches and SKIP LOCKED across worker replicas.
CREATE FUNCTION public.sync_store_availability(p_limit integer DEFAULT 200)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE changed integer;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid batch size'; END IF;
  WITH due AS (
    SELECT id FROM stores WHERE availability_next_change_at<=statement_timestamp()
    ORDER BY availability_next_change_at,id LIMIT p_limit FOR UPDATE SKIP LOCKED
  ) UPDATE stores s SET availability_next_change_at=NULL FROM due WHERE s.id=due.id;
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed;
END $$;

CREATE FUNCTION public.owner_availability_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  UPDATE stores SET availability_next_change_at=NULL WHERE owner_user_id=NEW.id;
  RETURN NEW;
END $$;
CREATE TRIGGER owner_availability_changed AFTER UPDATE OF partner_suspended,is_approved ON public.users
  FOR EACH ROW WHEN (OLD.partner_suspended IS DISTINCT FROM NEW.partner_suspended OR OLD.is_approved IS DISTINCT FROM NEW.is_approved)
  EXECUTE FUNCTION public.owner_availability_changed();

-- Preserve an existing deliberate closure until the next hours boundary.
UPDATE public.stores SET
  availability_override=CASE WHEN NOT is_active AND NOT admin_suspended THEN false END,
  availability_override_until=CASE WHEN NOT is_active AND NOT admin_suspended THEN
    coalesce(store_next_hours_boundary(open_time,close_time,statement_timestamp()),
      (date_trunc('day',statement_timestamp() AT TIME ZONE 'Asia/Kolkata')+interval '1 day') AT TIME ZONE 'Asia/Kolkata') END;

REVOKE ALL ON FUNCTION public.store_schedule_open(text,text,timestamptz),
  public.store_next_hours_boundary(text,text,timestamptz),public.store_effective_open(public.stores,timestamptz),
  public.stores_apply_availability(),public.partner_set_store_availability(uuid,uuid,boolean),
  public.sync_store_availability(integer),public.owner_availability_changed() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_schedule_open(text,text,timestamptz),
  public.store_next_hours_boundary(text,text,timestamptz),public.store_effective_open(public.stores,timestamptz),
  public.partner_set_store_availability(uuid,uuid,boolean),public.sync_store_availability(integer) TO service_role;
GRANT SELECT(availability_override,availability_override_until) ON public.stores TO anon,authenticated;

-- Final checkout computes from the database clock, even if a worker is delayed.
create or replace function public.checkout_assert_store(customer uuid, address_id uuid, store_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.addresses; s public.stores; minute integer; opens integer; closes integer; radius double precision; km double precision; current_time_at timestamptz;
  window_opens integer; window_closes integer;
begin
  current_time_at := checkout_clock();
  minute := extract(hour from current_time_at at time zone 'Asia/Kolkata')::integer * 60
    + extract(minute from current_time_at at time zone 'Asia/Kolkata')::integer;
  select ds.ordering_opens_minute, ds.ordering_closes_minute into window_opens, window_closes from public.delivery_settings ds limit 1;
  window_opens := coalesce(window_opens, 360); window_closes := coalesce(window_closes, 1350);
  if minute < window_opens or minute >= window_closes then
    raise exception using errcode='P1001', message='Ordering is closed until '
      || to_char(time '00:00' + make_interval(mins => window_opens % 1440), 'FMHH12:MI AM') || ' IST'; end if;
  select * into a from public.addresses where id=address_id and user_id=customer and deleted_at is null for share;
  if not found or a.latitude is null or a.longitude is null or not(a.latitude between -90 and 90 and a.longitude between -180 and 180) then
    raise exception using errcode='P1001', message='Choose a saved address with a valid map pin'; end if;
  select * into s from public.stores where id=store_id for share;
  if not found or not store_effective_open(s,current_time_at) then raise exception using errcode='P1001', message='Shop closed'; end if;
  perform 1 from public.zones where id=a.zone_id and id=s.zone_id and is_active for share;
  if not found then raise exception using errcode='P1001', message='Shop cannot deliver to this area'; end if;
  radius := coalesce(s.delivery_radius_km, default_delivery_radius_km());
  if s.lat is null or s.lng is null or not(s.lat between -90 and 90 and s.lng between -180 and 180) or radius <= 0 or radius::text in ('NaN','Infinity','-Infinity') then
    raise exception using errcode='P1001', message='Delivery from this shop is unavailable'; end if;
  km := delivery_road_km(a.latitude, a.longitude, s.lat, s.lng);
  if km > radius then raise exception using errcode='P1001', message='Shop cannot deliver to this address'; end if;
end $$;
REVOKE ALL ON FUNCTION public.checkout_assert_store(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_assert_store(uuid,uuid,uuid) TO service_role;

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
     'open_time','close_time','availability_override','availability_override_until','lat','lng','delivery_radius_km','photo_url','address_line','manual_address',
     'city','district','fssai_number','created_at'])),
  c.km FROM candidates c
 WHERE c.km <= least(coalesce(c.delivery_radius_km,d),coalesce(p_max_km,coalesce(c.delivery_radius_km,d)))
 ORDER BY c.km,c.id LIMIT p_limit;
END $$;
REVOKE ALL ON FUNCTION public.nearby_customer_stores(double precision,double precision,uuid,integer,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_customer_stores(double precision,double precision,uuid,integer,double precision) TO service_role;

-- Browse coverage is independent of today's opening state. Suspended/unapproved shops stay excluded.
CREATE OR REPLACE FUNCTION public.nearby_browsable_stores(
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
 WHERE s.zone_id=z AND NOT s.admin_suspended AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=s.owner_user_id AND u.is_approved AND NOT u.partner_suspended) AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
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
  FROM public.stores s WHERE s.zone_id=z AND NOT s.admin_suspended AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=s.owner_user_id AND u.is_approved AND NOT u.partner_suspended)
   AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
   AND (
    point(s.lng,s.lat) <@ box(point(greatest(-180,p_lng-dlng),lowlat),point(least(180,p_lng+dlng),highlat))
    OR (p_lng-dlng < -180 AND point(s.lng,s.lat) <@ box(point(p_lng-dlng+360,lowlat),point(180,highlat)))
    OR (p_lng+dlng > 180 AND point(s.lng,s.lat) <@ box(point(-180,lowlat),point(p_lng+dlng-360,highlat)))
   )
 )
 SELECT (SELECT jsonb_object_agg(k,v) FROM jsonb_each(to_jsonb(c)) AS fields(k,v)
   WHERE k=ANY(ARRAY['id','zone_id','name','category','rating','avg_prep_minutes','is_active',
     'open_time','close_time','availability_override','availability_override_until','lat','lng','delivery_radius_km','photo_url','address_line','manual_address',
     'city','district','fssai_number','created_at'])),
  c.km FROM candidates c
 WHERE c.km <= least(coalesce(c.delivery_radius_km,d),coalesce(p_max_km,coalesce(c.delivery_radius_km,d)))
 ORDER BY c.km,c.id LIMIT p_limit;
END $$;
REVOKE ALL ON FUNCTION public.nearby_browsable_stores(double precision,double precision,uuid,integer,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_browsable_stores(double precision,double precision,uuid,integer,double precision) TO service_role;

COMMIT;
