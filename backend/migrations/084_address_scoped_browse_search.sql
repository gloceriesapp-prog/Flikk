BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions,pg_temp;
ALTER TABLE products ADD COLUMN brand_name text;
CREATE INDEX products_search_name_trgm ON products USING gin(name gin_trgm_ops) WHERE approval_status='approved';
CREATE INDEX products_search_words ON products USING gin(to_tsvector('simple',name||' '||coalesce(local_name,''))) WHERE approval_status='approved';
CREATE INDEX products_category_browse ON products(sub_category_id,store_id,id) WHERE approval_status='approved';
CREATE FUNCTION public.search_customer_product_ids(p_stores uuid[],p_query text,p_after_score double precision DEFAULT null,p_after_id uuid DEFAULT null,p_limit integer DEFAULT 31)
RETURNS TABLE(id uuid,score double precision) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
 WITH term AS(SELECT lower(btrim(p_query)) q,CASE lower(btrim(p_query)) WHEN 'curd' THEN 'yogurt' WHEN 'yoghurt' THEN 'yogurt' WHEN 'atta' THEN 'flour' WHEN 'aloo' THEN 'potato' WHEN 'pyaaz' THEN 'onion' ELSE lower(btrim(p_query)) END alias),
 matches AS(SELECT p.id,greatest(similarity(lower(p.name),t.q),similarity(lower(p.name),t.alias))::double precision
  + CASE WHEN lower(p.name)=t.q THEN 5 WHEN lower(p.name) LIKE t.q||'%' THEN 3 ELSE 0 END
  + ts_rank(to_tsvector('simple',p.name||' '||coalesce(p.local_name,'')),websearch_to_tsquery('simple',t.q||' OR '||t.alias))::double precision AS score
 FROM products p JOIN stores s ON s.id=p.store_id CROSS JOIN term t WHERE p.store_id=ANY(p_stores) AND s.is_active AND p.approval_status='approved'
  AND p.is_in_stock AND p.stock_status<>'out_of_stock' AND cardinality(p_stores)<=20 AND length(t.q) BETWEEN 2 AND 100
  AND (p.name % t.q OR p.name % t.alias OR lower(p.name) LIKE '%'||replace(replace(t.q,'%','\%'),'_','\_')||'%'
   OR to_tsvector('simple',p.name||' '||coalesce(p.local_name,'')) @@ websearch_to_tsquery('simple',t.q||' OR '||t.alias)))
 SELECT m.id,m.score FROM matches m WHERE p_after_score IS NULL OR (m.score,m.id)<(p_after_score,p_after_id)
 ORDER BY m.score DESC,m.id DESC LIMIT least(greatest(p_limit,1),61);
$$;
CREATE FUNCTION public.browse_customer_product_ids(p_stores uuid[],p_category uuid,p_subcategory uuid,p_type text,p_brand text,p_veg boolean,p_deals boolean,p_sort text,p_after_score double precision,p_after_id uuid,p_limit integer)
RETURNS TABLE(id uuid,score double precision) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH matches AS(SELECT p.id,CASE p_sort WHEN 'price-low' THEN -p.price WHEN 'price-high' THEN p.price
  WHEN 'discount' THEN CASE WHEN p.original_price>p.price THEN (p.original_price-p.price)/p.original_price ELSE 0 END ELSE 0 END::double precision score
 FROM products p JOIN stores s ON s.id=p.store_id JOIN sub_categories c ON c.id=p.sub_category_id
 WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND s.is_active AND p.approval_status='approved' AND p.is_in_stock AND p.stock_status<>'out_of_stock'
 AND c.is_active AND (p_category IS NULL OR c.category_id=p_category) AND (p_subcategory IS NULL OR c.id=p_subcategory)
 AND (p_type='' OR lower(p.category)=p_type) AND (p_brand='' OR p.brand_name=p_brand) AND (NOT p_veg OR p.is_veg) AND (NOT p_deals OR p.original_price>p.price))
 SELECT m.id,m.score FROM matches m WHERE p_after_score IS NULL OR (m.score,m.id)<(p_after_score,p_after_id)
 ORDER BY m.score DESC,m.id DESC LIMIT least(greatest(p_limit,1),61);
$$;
CREATE FUNCTION public.customer_category_facets(p_stores uuid[],p_category uuid,p_subcategory uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH available AS(SELECT p.category,p.brand_name FROM products p JOIN stores s ON s.id=p.store_id JOIN sub_categories c ON c.id=p.sub_category_id
 WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND s.is_active AND p.approval_status='approved' AND p.is_in_stock AND p.stock_status<>'out_of_stock' AND c.is_active
 AND (p_category IS NULL OR c.category_id=p_category) AND (p_subcategory IS NULL OR c.id=p_subcategory))
 SELECT jsonb_build_object('types',coalesce((SELECT jsonb_agg(category ORDER BY category) FROM(SELECT DISTINCT category FROM available WHERE category IS NOT NULL LIMIT 100)t),'[]'::jsonb),
 'brands',coalesce((SELECT jsonb_agg(brand_name ORDER BY brand_name) FROM(SELECT DISTINCT brand_name FROM available WHERE brand_name IS NOT NULL LIMIT 100)b),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION search_customer_product_ids(uuid[],text,double precision,uuid,integer),browse_customer_product_ids(uuid[],uuid,uuid,text,text,boolean,boolean,text,double precision,uuid,integer),customer_category_facets(uuid[],uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION search_customer_product_ids(uuid[],text,double precision,uuid,integer),browse_customer_product_ids(uuid[],uuid,uuid,text,text,boolean,boolean,text,double precision,uuid,integer),customer_category_facets(uuid[],uuid,uuid) TO service_role;
COMMIT;
