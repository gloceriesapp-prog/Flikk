-- Only service_role can execute these selectors. Hydration uses the existing
-- public product projection, never returns the full catalogue to the API.
CREATE INDEX IF NOT EXISTS products_browse_store_id_idx
ON public.products(store_id, id)
WHERE approval_status = 'approved' AND stock_status <> 'out_of_stock';

CREATE OR REPLACE FUNCTION public.collection_product_matches(p public.products, rule jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT
 (coalesce(rule->>'mode','automatic') <> 'manual' OR coalesce(rule->'productIds','[]') ? p.id::text)
 AND (jsonb_array_length(coalesce(rule->'storeIds','[]')) = 0 OR rule->'storeIds' ? p.store_id::text)
 AND (jsonb_array_length(coalesce(rule->'categoryIds','[]')) = 0 OR rule->'categoryIds' ? p.sub_category_id::text)
 AND (jsonb_array_length(coalesce(rule->'includeTerms','[]')) = 0 OR EXISTS (
   SELECT 1 FROM jsonb_array_elements_text(rule->'includeTerms') t
   WHERE strpos(lower(p.name || ' ' || p.category), lower(t)) > 0))
 AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(coalesce(rule->'excludeTerms','[]')) t
   WHERE strpos(lower(p.name || ' ' || p.category), lower(t)) > 0)
 AND (NOT coalesce((rule->>'discountedOnly')::boolean,false) OR p.original_price > p.price);
$$;

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
         AND p.stock_status <> 'out_of_stock'
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
       AND p.stock_status <> 'out_of_stock' AND (p_after IS NULL OR p.id > p_after)
       AND public.collection_product_matches(p, r->'selection')
       AND public.collection_product_matches(p, coalesce(r->'base','{}'))
     ORDER BY p.id LIMIT least(greatest(coalesce((r->>'limit')::int,31),1),61)
   ) selected ORDER BY selected.id LIMIT 61;
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.collection_product_matches(public.products,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.browse_collection_ids(uuid,jsonb,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.collection_product_matches(public.products,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.browse_collection_ids(uuid,jsonb,uuid,boolean) TO service_role;
