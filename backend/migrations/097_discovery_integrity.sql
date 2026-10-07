-- Discovery integrity: deactivated stores leave discovery, created_at joins the
-- public store contract, store pages filter/sort server-side, home rows get
-- distinct feeds, and home tab tiles can link to a real category.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- 1. Nearby stores: only active shops, and expose created_at/manual_address
-- (both already in PUBLIC_STORE_FIELDS' contract) so Home sorts never see
-- undefined. Same bounded spatial candidate search as 074.
CREATE INDEX IF NOT EXISTS stores_active_zone_radius_idx ON public.stores
 (zone_id, (coalesce(delivery_radius_km,12)) DESC)
 WHERE is_active AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180;

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
 SELECT coalesce(s.delivery_radius_km,12) INTO reach FROM public.stores s
 WHERE s.zone_id=z AND s.is_active AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
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
 WHERE c.km <= least(coalesce(c.delivery_radius_km,12),coalesce(p_max_km,coalesce(c.delivery_radius_km,12)))
 ORDER BY c.km,c.id LIMIT p_limit;
END $$;
REVOKE ALL ON FUNCTION public.nearby_customer_stores(double precision,double precision,uuid,integer,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_customer_stores(double precision,double precision,uuid,integer,double precision) TO service_role;

-- 2. Store detail: filters and price sort run over the whole catalogue,
-- keyset-paged on (score,id). Facets come from the server, not loaded pages.
CREATE INDEX IF NOT EXISTS products_store_category_idx ON public.products(store_id,category,id) WHERE approval_status='approved';
CREATE INDEX IF NOT EXISTS products_store_price_idx ON public.products(store_id,price,id) WHERE approval_status='approved';

CREATE OR REPLACE FUNCTION public.store_product_page_ids(
 p_store uuid, p_category text, p_veg boolean, p_deals boolean, p_price_band text, p_sort text,
 p_after_score double precision, p_after_id uuid, p_limit integer)
RETURNS TABLE(id uuid, score double precision) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH matches AS (
  SELECT p.id, CASE p_sort WHEN 'price_low' THEN -p.price WHEN 'price_high' THEN p.price ELSE 0 END::double precision AS score
  FROM products p
  WHERE p.store_id=p_store AND p.approval_status='approved'
   AND (p_category IS NULL OR p.category=p_category)
   AND (NOT p_veg OR p.is_veg IS NOT FALSE)
   AND (NOT p_deals OR p.original_price>p.price)
   AND CASE p_price_band WHEN 'under_100' THEN p.price<100 WHEN '100_300' THEN p.price BETWEEN 100 AND 300
        WHEN 'above_300' THEN p.price>300 ELSE true END)
 SELECT m.id,m.score FROM matches m WHERE p_after_score IS NULL OR (m.score,m.id)<(p_after_score,p_after_id)
 ORDER BY m.score DESC,m.id DESC LIMIT least(greatest(p_limit,1),61);
$$;

CREATE OR REPLACE FUNCTION public.store_category_facets(p_store uuid)
RETURNS TABLE(category text, product_count bigint, image_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p.category, count(*), (array_agg(p.image_url ORDER BY p.id) FILTER (WHERE p.image_url IS NOT NULL))[1]
 FROM products p WHERE p.store_id=p_store AND p.approval_status='approved' AND nullif(btrim(p.category),'') IS NOT NULL
 GROUP BY p.category ORDER BY p.category LIMIT 100;
$$;

-- 3. Distinct home feeds. Popularity now covers up to 30 days (Most Bought =
-- 30d, Trending = 7d). Deals rank by real discount percentage.
CREATE OR REPLACE FUNCTION public.popular_customer_product_ids(p_stores uuid[],p_days integer DEFAULT 7) RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT r.product_id FROM product_popularity_daily r JOIN products p ON p.id=r.product_id JOIN stores s ON s.id=p.store_id
 WHERE r.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND r.day>=(now() AT TIME ZONE 'Asia/Kolkata')::date-least(greatest(p_days,1),30)
 AND p.approval_status='approved'
 GROUP BY r.product_id ORDER BY sum(r.quantity) DESC,r.product_id LIMIT 30;
$$;

CREATE INDEX IF NOT EXISTS products_store_deals_idx ON public.products(store_id,id)
 WHERE approval_status='approved' AND original_price > price;
CREATE OR REPLACE FUNCTION public.deal_customer_product_ids(p_stores uuid[], p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p.id FROM products p
 WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND p.approval_status='approved'
  AND p.original_price > p.price AND p.price > 0
 ORDER BY (p.original_price-p.price)/p.original_price DESC, p.id LIMIT least(greatest(p_limit,1),30);
$$;

REVOKE ALL ON FUNCTION public.store_product_page_ids(uuid,text,boolean,boolean,text,text,double precision,uuid,integer),
 public.store_category_facets(uuid), public.popular_customer_product_ids(uuid[],integer),
 public.deal_customer_product_ids(uuid[],integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_product_page_ids(uuid,text,boolean,boolean,text,text,double precision,uuid,integer),
 public.store_category_facets(uuid), public.popular_customer_product_ids(uuid[],integer),
 public.deal_customer_product_ids(uuid[],integer) TO service_role;

-- 4. Home tab tiles link to a real category or subcategory (admin sets both or neither).
ALTER TABLE public.home_tab_tiles ADD COLUMN IF NOT EXISTS link_type text;
ALTER TABLE public.home_tab_tiles ADD COLUMN IF NOT EXISTS link_id uuid;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='home_tab_tiles_link_check') THEN
  ALTER TABLE public.home_tab_tiles ADD CONSTRAINT home_tab_tiles_link_check CHECK (
   (link_type IS NULL AND link_id IS NULL) OR (link_type IN ('category','subcategory') AND link_id IS NOT NULL));
 END IF;
END $$;

-- 5. Wishlist keyset pages (newest first).
CREATE INDEX IF NOT EXISTS wishlist_items_customer_page_idx ON public.wishlist_items(customer_id, created_at DESC, id DESC);
COMMIT;
