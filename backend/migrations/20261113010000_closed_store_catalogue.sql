-- A temporary store closure pauses ordering, not product browsing/cart drafts.
-- Suspension and unapproved owners stay hidden. Checkout checks are unchanged.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
CREATE OR REPLACE FUNCTION public.store_catalogue_is_browsable(p_store uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM stores s JOIN users u ON u.id=s.owner_user_id
  WHERE s.id=p_store AND NOT s.admin_suspended AND u.is_approved AND NOT u.partner_suspended);
$$;
REVOKE ALL ON FUNCTION public.store_catalogue_is_browsable(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_catalogue_is_browsable(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.store_catalogue_page_ids(
 p_store uuid, p_category uuid, p_subcategory uuid, p_query text,
 p_veg boolean, p_deals boolean, p_price_band text, p_sort text,
 p_after_score double precision, p_after_id uuid, p_limit integer)
RETURNS TABLE(id uuid, score double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH matches AS (
  SELECT p.id, CASE p_sort WHEN 'price_low' THEN -p.price WHEN 'price_high' THEN p.price ELSE 0 END::double precision AS score
  FROM products p JOIN stores s ON s.id=p.store_id
  LEFT JOIN sub_categories sc ON sc.id=p.sub_category_id
  LEFT JOIN categories c ON c.id=sc.category_id
  WHERE p.store_id=p_store AND (SELECT public.store_catalogue_is_browsable(p_store)) AND p.approval_status='approved' AND NOT p.preorder_enabled
   AND (p_category IS NULL OR (c.id=p_category AND c.is_active AND sc.is_active))
   AND (p_subcategory IS NULL OR (p_category IS NOT NULL AND sc.id=p_subcategory))
   AND (coalesce(p_query,'')='' OR p.name ILIKE '%'||p_query||'%' OR EXISTS (
     SELECT 1 FROM product_options o WHERE o.product_id=p.id AND o.name ILIKE '%'||p_query||'%'))
   AND (NOT p_veg OR p.is_veg IS NOT FALSE)
   AND (NOT p_deals OR p.original_price>p.price)
   AND CASE p_price_band WHEN 'under_100' THEN p.price<100 WHEN '100_300' THEN p.price BETWEEN 100 AND 300
        WHEN 'above_300' THEN p.price>300 ELSE true END)
 SELECT m.id,m.score FROM matches m WHERE p_after_score IS NULL OR (m.score,m.id)<(p_after_score,p_after_id)
 ORDER BY m.score DESC,m.id DESC LIMIT least(greatest(p_limit,1),61);
$$;
REVOKE ALL ON FUNCTION public.store_catalogue_page_ids(uuid,uuid,uuid,text,boolean,boolean,text,text,double precision,uuid,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_catalogue_page_ids(uuid,uuid,uuid,text,boolean,boolean,text,text,double precision,uuid,integer)
 TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
