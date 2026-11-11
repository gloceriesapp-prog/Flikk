-- Search flavour names without duplicating the parent product in results.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SET LOCAL search_path=public,extensions,pg_temp;
CREATE INDEX product_options_search_name_trgm ON public.product_options USING gin(lower(name) gin_trgm_ops);
CREATE FUNCTION public.search_customer_product_matches(p_stores uuid[],p_query text,p_after_score double precision DEFAULT null,p_after_id uuid DEFAULT null,p_limit integer DEFAULT 31)
RETURNS TABLE(id uuid,score double precision,matched_option_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
 WITH term AS (
  SELECT lower(btrim(p_query)) q, CASE lower(btrim(p_query))
   WHEN 'curd' THEN 'yogurt' WHEN 'yoghurt' THEN 'yogurt' WHEN 'atta' THEN 'flour'
   WHEN 'aloo' THEN 'potato' WHEN 'pyaaz' THEN 'onion' ELSE lower(btrim(p_query)) END alias
 ), candidates AS (
  SELECT p.id,
   greatest(similarity(lower(p.name),t.q),similarity(lower(p.name),t.alias))::double precision
    + CASE WHEN lower(p.name)=t.q THEN 5 WHEN lower(p.name) LIKE t.q||'%' THEN 3 ELSE 0 END
    + ts_rank(to_tsvector('simple',p.name||' '||coalesce(p.local_name,'')),websearch_to_tsquery('simple',t.q||' OR '||t.alias))::double precision AS main_score,
   option_match.id AS option_id, option_match.score AS option_score
  FROM products p JOIN stores s ON s.id=p.store_id CROSS JOIN term t
  LEFT JOIN LATERAL (
   SELECT o.id,
    greatest(similarity(lower(o.name),t.q),similarity(lower(o.name),t.alias))::double precision
     + CASE WHEN lower(o.name)=t.q THEN 5 WHEN lower(o.name) LIKE t.q||'%' THEN 3 ELSE 0 END
     + ts_rank(to_tsvector('simple',o.name),websearch_to_tsquery('simple',t.q||' OR '||t.alias))::double precision AS score
   FROM product_options o WHERE o.product_id=p.id AND (
    lower(o.name) % t.q OR lower(o.name) % t.alias
    OR lower(o.name) LIKE '%'||replace(replace(t.q,'%','\%'),'_','\_')||'%'
    OR to_tsvector('simple',o.name) @@ websearch_to_tsquery('simple',t.q||' OR '||t.alias))
   ORDER BY score DESC,o.is_available DESC,o.sort_order,o.id LIMIT 1
  ) option_match ON true
  WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND length(t.q) BETWEEN 2 AND 100
   AND p.approval_status='approved' AND NOT p.preorder_enabled
   AND (option_match.id IS NOT NULL OR p.name % t.q OR p.name % t.alias
    OR lower(p.name) LIKE '%'||replace(replace(t.q,'%','\%'),'_','\_')||'%'
    OR to_tsvector('simple',p.name||' '||coalesce(p.local_name,'')) @@ websearch_to_tsquery('simple',t.q||' OR '||t.alias))
 ), ranked AS (
  SELECT c.id,greatest(c.main_score,coalesce(c.option_score,0)) AS score,
   CASE WHEN c.option_score>c.main_score THEN c.option_id ELSE NULL END AS matched_option_id
  FROM candidates c
 )
 SELECT r.id,r.score,r.matched_option_id FROM ranked r
 WHERE p_after_score IS NULL OR (r.score,r.id)<(p_after_score,p_after_id)
 ORDER BY r.score DESC,r.id DESC LIMIT least(greatest(p_limit,1),61);
$$;
-- Preserve the existing SQL/API contract for older deployments and clients.
CREATE OR REPLACE FUNCTION public.search_customer_product_ids(p_stores uuid[],p_query text,p_after_score double precision DEFAULT null,p_after_id uuid DEFAULT null,p_limit integer DEFAULT 31)
RETURNS TABLE(id uuid,score double precision) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT m.id,m.score FROM public.search_customer_product_matches(p_stores,p_query,p_after_score,p_after_id,p_limit) m;
$$;
REVOKE ALL ON FUNCTION public.search_customer_product_matches(uuid[],text,double precision,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_customer_product_matches(uuid[],text,double precision,uuid,integer) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
