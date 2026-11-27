-- Category page item count (2026-11-27). browse_customer_product_ids pages
-- at most 61 ids per call, so the app can't know how many products a
-- category / subcategory has near the customer. This counts the same
-- matches (same shops, category, filters), minus pre-order products, which
-- the page itself leaves out (hydrateBrowse). Read-only; called by the
-- backend (service role) on the first page of GET /browse/category.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION public.count_customer_category_products(p_stores uuid[],p_category uuid,p_subcategory uuid,p_type text,p_brand text,p_veg boolean,p_deals boolean)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT count(*)::integer
 FROM products p JOIN stores s ON s.id=p.store_id JOIN sub_categories c ON c.id=p.sub_category_id
 WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND p.approval_status='approved' AND p.quick_tab_key IS NULL
 AND NOT p.preorder_enabled
 AND c.is_active AND (p_category IS NULL OR c.category_id=p_category) AND (p_subcategory IS NULL OR c.id=p_subcategory)
 AND (p_type='' OR lower(p.category)=p_type) AND (p_brand='' OR p.brand_name=p_brand) AND (NOT p_veg OR p.is_veg) AND (NOT p_deals OR p.original_price>p.price);
$$;
REVOKE ALL ON FUNCTION public.count_customer_category_products(uuid[],uuid,uuid,text,text,boolean,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_customer_category_products(uuid[],uuid,uuid,text,text,boolean,boolean) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
