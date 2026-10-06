-- Browse visibility is independent of temporary opening/stock availability.
-- Checkout eligibility, approval, reservations and final guards are unchanged.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE INDEX IF NOT EXISTS products_browse_approved_store_id_idx
ON public.products(store_id,id) WHERE approval_status='approved';
CREATE OR REPLACE FUNCTION public.browse_collection_ids(
 p_store_id uuid, p_rules jsonb, p_after uuid DEFAULT NULL, p_preview boolean DEFAULT true
) RETURNS TABLE(id uuid) LANGUAGE plpgsql STABLE SET search_path = public AS $$
BEGIN
 IF jsonb_array_length(p_rules) > 1640 THEN RAISE EXCEPTION 'Too many collection rules'; END IF;
 IF p_preview THEN
   RETURN QUERY
   SELECT DISTINCT selected.id FROM jsonb_array_elements(p_rules) r
   CROSS JOIN LATERAL (
     SELECT ranked.id FROM (
       SELECT p.id,
         CASE WHEN r->'selection'->>'mode' = 'manual' THEN
           (SELECT ord FROM jsonb_array_elements_text(r->'selection'->'productIds') WITH ORDINALITY x(val, ord) WHERE val = p.id::text)
         END manual_rank,
         row_number() OVER (PARTITION BY bucket.term_index ORDER BY p.id) bucket_rank,
         bucket.term_index
       FROM public.products p
       LEFT JOIN LATERAL (
         SELECT ord AS term_index FROM jsonb_array_elements_text(coalesce(r->'selection'->'includeTerms','[]')) WITH ORDINALITY t(val,ord)
         WHERE strpos(lower(p.name || ' ' || p.category), lower(val)) > 0 ORDER BY ord LIMIT 1
       ) bucket ON true
       WHERE p.store_id = p_store_id AND p.approval_status = 'approved'
         AND public.collection_product_matches(p, r->'selection')
         AND public.collection_product_matches(p, coalesce(r->'base','{}'))
     ) ranked ORDER BY ranked.manual_rank, ranked.bucket_rank, ranked.term_index, ranked.id
     LIMIT least(greatest(coalesce((r->>'limit')::int,12),1),24)
   ) selected ORDER BY selected.id LIMIT 600;
 ELSE
   RETURN QUERY
   SELECT DISTINCT selected.id FROM jsonb_array_elements(p_rules) r
   CROSS JOIN LATERAL (
     SELECT p.id FROM public.products p
     WHERE p.store_id = p_store_id AND p.approval_status = 'approved'
       AND (p_after IS NULL OR p.id > p_after)
       AND public.collection_product_matches(p, r->'selection')
       AND public.collection_product_matches(p, coalesce(r->'base','{}'))
     ORDER BY p.id LIMIT least(greatest(coalesce((r->>'limit')::int,31),1),61)
   ) selected ORDER BY selected.id LIMIT 61;
 END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.search_customer_product_ids(p_stores uuid[],p_query text,p_after_score double precision DEFAULT null,p_after_id uuid DEFAULT null,p_limit integer DEFAULT 31)
RETURNS TABLE(id uuid,score double precision) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
 WITH term AS(SELECT lower(btrim(p_query)) q,CASE lower(btrim(p_query)) WHEN 'curd' THEN 'yogurt' WHEN 'yoghurt' THEN 'yogurt' WHEN 'atta' THEN 'flour' WHEN 'aloo' THEN 'potato' WHEN 'pyaaz' THEN 'onion' ELSE lower(btrim(p_query)) END alias),
 matches AS(SELECT p.id,greatest(similarity(lower(p.name),t.q),similarity(lower(p.name),t.alias))::double precision
  + CASE WHEN lower(p.name)=t.q THEN 5 WHEN lower(p.name) LIKE t.q||'%' THEN 3 ELSE 0 END
  + ts_rank(to_tsvector('simple',p.name||' '||coalesce(p.local_name,'')),websearch_to_tsquery('simple',t.q||' OR '||t.alias))::double precision AS score
 FROM products p JOIN stores s ON s.id=p.store_id CROSS JOIN term t WHERE p.store_id=ANY(p_stores) AND p.approval_status='approved'
  AND cardinality(p_stores)<=20 AND length(t.q) BETWEEN 2 AND 100
  AND (p.name % t.q OR p.name % t.alias OR lower(p.name) LIKE '%'||replace(replace(t.q,'%','\%'),'_','\_')||'%'
   OR to_tsvector('simple',p.name||' '||coalesce(p.local_name,'')) @@ websearch_to_tsquery('simple',t.q||' OR '||t.alias)))
 SELECT m.id,m.score FROM matches m WHERE p_after_score IS NULL OR (m.score,m.id)<(p_after_score,p_after_id)
 ORDER BY m.score DESC,m.id DESC LIMIT least(greatest(p_limit,1),61);
$$;
CREATE OR REPLACE FUNCTION public.browse_customer_product_ids(p_stores uuid[],p_category uuid,p_subcategory uuid,p_type text,p_brand text,p_veg boolean,p_deals boolean,p_sort text,p_after_score double precision,p_after_id uuid,p_limit integer)
RETURNS TABLE(id uuid,score double precision) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH matches AS(SELECT p.id,CASE p_sort WHEN 'price-low' THEN -p.price WHEN 'price-high' THEN p.price
  WHEN 'discount' THEN CASE WHEN p.original_price>p.price THEN (p.original_price-p.price)/p.original_price ELSE 0 END ELSE 0 END::double precision score
 FROM products p JOIN stores s ON s.id=p.store_id JOIN sub_categories c ON c.id=p.sub_category_id
 WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND p.approval_status='approved'
 AND c.is_active AND (p_category IS NULL OR c.category_id=p_category) AND (p_subcategory IS NULL OR c.id=p_subcategory)
 AND (p_type='' OR lower(p.category)=p_type) AND (p_brand='' OR p.brand_name=p_brand) AND (NOT p_veg OR p.is_veg) AND (NOT p_deals OR p.original_price>p.price))
 SELECT m.id,m.score FROM matches m WHERE p_after_score IS NULL OR (m.score,m.id)<(p_after_score,p_after_id)
 ORDER BY m.score DESC,m.id DESC LIMIT least(greatest(p_limit,1),61);
$$;
CREATE OR REPLACE FUNCTION public.customer_category_facets(p_stores uuid[],p_category uuid,p_subcategory uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH available AS(SELECT p.category,p.brand_name FROM products p JOIN stores s ON s.id=p.store_id JOIN sub_categories c ON c.id=p.sub_category_id
 WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND p.approval_status='approved' AND c.is_active
 AND (p_category IS NULL OR c.category_id=p_category) AND (p_subcategory IS NULL OR c.id=p_subcategory))
 SELECT jsonb_build_object('types',coalesce((SELECT jsonb_agg(category ORDER BY category) FROM(SELECT DISTINCT category FROM available WHERE category IS NOT NULL LIMIT 100)t),'[]'::jsonb),
 'brands',coalesce((SELECT jsonb_agg(brand_name ORDER BY brand_name) FROM(SELECT DISTINCT brand_name FROM available WHERE brand_name IS NOT NULL LIMIT 100)b),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION search_customer_product_ids(uuid[],text,double precision,uuid,integer),browse_customer_product_ids(uuid[],uuid,uuid,text,text,boolean,boolean,text,double precision,uuid,integer),customer_category_facets(uuid[],uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION search_customer_product_ids(uuid[],text,double precision,uuid,integer),browse_customer_product_ids(uuid[],uuid,uuid,text,text,boolean,boolean,text,double precision,uuid,integer),customer_category_facets(uuid[],uuid,uuid) TO service_role;

REVOKE ALL ON FUNCTION public.browse_collection_ids(uuid,jsonb,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.browse_collection_ids(uuid,jsonb,uuid,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.popular_customer_product_ids(p_stores uuid[],p_days integer DEFAULT 7) RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT r.product_id FROM product_popularity_daily r JOIN products p ON p.id=r.product_id JOIN stores s ON s.id=p.store_id
 WHERE r.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND r.day>=(now() AT TIME ZONE 'Asia/Kolkata')::date-least(greatest(p_days,1),14)
 AND p.approval_status='approved'
 GROUP BY r.product_id ORDER BY sum(r.quantity) DESC,r.product_id LIMIT 30;
$$;
CREATE OR REPLACE FUNCTION public.repeat_purchase_candidates(p_customer uuid,p_stores uuid[],p_limit int DEFAULT 10)
RETURNS TABLE(product_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH recent AS MATERIALIZED (
  SELECT id,placed_at FROM orders WHERE customer_id=p_customer AND status='delivered'
  ORDER BY placed_at DESC,id DESC LIMIT 100
 ) SELECT i.product_id FROM recent o JOIN order_items i ON i.order_id=o.id
 JOIN products p ON p.id=i.product_id JOIN stores s ON s.id=p.store_id
 WHERE p.store_id=ANY(p_stores) AND p.approval_status='approved'
 AND cardinality(p_stores)<=100
 GROUP BY i.product_id ORDER BY count(*) DESC,max(o.placed_at) DESC,i.product_id
 LIMIT least(greatest(p_limit,1),10);
$$;
COMMIT;
