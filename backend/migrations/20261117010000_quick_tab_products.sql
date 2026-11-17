-- Quick-category products use the existing catalogue, packs and checkout.
-- General discovery excludes them; published manual selections and global search include them.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, extensions, pg_temp;

ALTER TABLE public.products ADD COLUMN quick_tab_key text,
  ADD CONSTRAINT products_quick_tab_standard_order CHECK (quick_tab_key IS NULL OR NOT preorder_enabled),
  ADD CONSTRAINT products_quick_tab_no_catalogue_assignment
    CHECK (quick_tab_key IS NULL OR (sub_category_id IS NULL AND catalogue_item_id IS NULL));
CREATE UNIQUE INDEX products_quick_tab_store_name_unique
  ON public.products (quick_tab_key, store_id, lower(btrim(name))) WHERE quick_tab_key IS NOT NULL;

CREATE POLICY products_public_general_catalogue ON public.products AS RESTRICTIVE
FOR SELECT TO anon, authenticated USING (quick_tab_key IS NULL);

-- Callers already restrict scoped products to explicit picks in their own tab.
CREATE OR REPLACE FUNCTION public.collection_product_matches(p public.products, rule jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT
 (coalesce(rule->>'mode','automatic') <> 'manual' OR coalesce(rule->'productIds','[]') ? p.id::text)
 AND (jsonb_array_length(coalesce(rule->'storeIds','[]')) = 0 OR rule->'storeIds' ? p.store_id::text)
 AND (p.quick_tab_key IS NOT NULL OR jsonb_array_length(coalesce(rule->'categoryIds','[]')) = 0
      OR rule->'categoryIds' ? p.sub_category_id::text)
 AND (jsonb_array_length(coalesce(rule->'includeTerms','[]')) = 0 OR EXISTS (
   SELECT 1 FROM jsonb_array_elements_text(rule->'includeTerms') t
   WHERE strpos(lower(p.name || ' ' || p.category), lower(t)) > 0))
 AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(coalesce(rule->'excludeTerms','[]')) t
   WHERE strpos(lower(p.name || ' ' || p.category), lower(t)) > 0)
 AND (NOT coalesce((rule->>'discountedOnly')::boolean,false) OR p.original_price > p.price);
$$;

CREATE FUNCTION public.create_quick_tab_product(
  p_tab text, p_fields jsonb, p_variants jsonb, p_extras jsonb, p_markups jsonb, p_options jsonb
) RETURNS uuid LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  new_id uuid;
  item record;
  extras products;
BEGIN
  IF p_tab IS NULL OR NOT (
    EXISTS (SELECT 1 FROM home_content h WHERE h.tab_key = p_tab)
    OR EXISTS (SELECT 1 FROM home_tabs t WHERE 'custom-' || t.id::text = p_tab)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0400', MESSAGE = 'This quick category no longer exists.';
  END IF;
  IF coalesce((p_extras->>'preorder_enabled')::boolean, false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0400', MESSAGE = 'Quick category products use standard ordering.';
  END IF;

  new_id := save_catalogue_product(NULL, NULL,
    p_fields || '{"approval_status":"approved","sub_category_id":null}'::jsonb, p_variants);
  SELECT * INTO extras FROM products p WHERE p.id = new_id;
  extras := jsonb_populate_record(extras, p_extras);
  UPDATE products SET
    quick_tab_key = p_tab,
    extra_image_urls = extras.extra_image_urls,
    cut_options_enabled = extras.cut_options_enabled,
    bulk_min_kg = extras.bulk_min_kg,
    waive_commission = extras.waive_commission,
    show_unit_price = extras.show_unit_price,
    serving_options = extras.serving_options,
    brand_id = extras.brand_id
  WHERE id = new_id;

  FOR item IN SELECT * FROM jsonb_to_recordset(p_markups)
    AS m(unit_type text, quantity numeric, platform_markup numeric)
  LOOP
    UPDATE product_variants SET platform_markup = item.platform_markup
    WHERE product_variants.product_id = new_id
      AND unit_type = item.unit_type AND quantity = item.quantity;
  END LOOP;
  IF p_options IS NOT NULL THEN PERFORM save_product_options(new_id, p_options); END IF;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_quick_tab_product(text,jsonb,jsonb,jsonb,jsonb,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_quick_tab_product(text,jsonb,jsonb,jsonb,jsonb,jsonb) TO service_role;

CREATE FUNCTION public.quick_tab_product_is_live(p_product public.products)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1
    FROM home_content h
    CROSS JOIN LATERAL jsonb_array_elements(h.content->'sections') s
    WHERE h.tab_key = p_product.quick_tab_key AND h.content->>'enabled' = 'true' AND s->>'enabled' = 'true'
      AND (
        (s->>'kind' IN ('products','hero') AND s->'selection'->>'mode' = 'manual'
          AND public.collection_product_matches(p_product, s->'selection'))
        OR (s->>'kind' = 'categories' AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(coalesce(s->'items', '[]'::jsonb)) i
          WHERE i->>'enabled' = 'true' AND i->'selection'->>'mode' = 'manual'
            AND public.collection_product_matches(p_product, i->'selection')
        ))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.quick_tab_product_is_live(public.products) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quick_tab_product_is_live(public.products) TO service_role;

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
         AND (p.quick_tab_key IS NULL OR
              (p.quick_tab_key = r->>'tabKey' AND r->'selection'->>'mode' = 'manual'))
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
       AND (p.quick_tab_key IS NULL OR
            (p.quick_tab_key = r->>'tabKey' AND r->'selection'->>'mode' = 'manual'))
       AND public.collection_product_matches(p, r->'selection')
       AND public.collection_product_matches(p, coalesce(r->'base','{}'))
     ORDER BY p.id LIMIT least(greatest(coalesce((r->>'limit')::int,31),1),61)
   ) selected ORDER BY selected.id LIMIT 61;
 END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_customer_product_matches(p_stores uuid[],p_query text,p_after_score double precision DEFAULT null,p_after_id uuid DEFAULT null,p_limit integer DEFAULT 31)
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
   AND (p.quick_tab_key IS NULL OR public.quick_tab_product_is_live(p))
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
  WHERE p.store_id=p_store AND (SELECT public.store_catalogue_is_browsable(p_store)) AND p.approval_status='approved' AND p.quick_tab_key IS NULL AND NOT p.preorder_enabled
   AND (p_category IS NULL OR (c.id=p_category AND c.is_active AND sc.is_active))
   AND (p_subcategory IS NULL OR (p_category IS NOT NULL AND sc.id=p_subcategory))
   AND (coalesce(p_query,'')='' OR p.name ILIKE '%'||p_query||'%' OR EXISTS (
     SELECT 1 FROM product_options o WHERE o.product_id=p.id AND o.name ILIKE '%'||p_query||'%'))
   AND (NOT p_veg OR p.is_veg IS TRUE)
   AND (NOT p_deals OR p.original_price>p.price)
   AND CASE p_price_band WHEN 'under_100' THEN p.price<100 WHEN '100_300' THEN p.price BETWEEN 100 AND 300
        WHEN 'above_300' THEN p.price>300 ELSE true END)
 SELECT m.id,m.score FROM matches m WHERE p_after_score IS NULL OR (m.score,m.id)<(p_after_score,p_after_id)
 ORDER BY m.score DESC,m.id DESC LIMIT least(greatest(p_limit,1),61);
$$;

CREATE OR REPLACE FUNCTION public.store_product_page_ids(
 p_store uuid, p_category text, p_veg boolean, p_deals boolean, p_price_band text, p_sort text,
 p_after_score double precision, p_after_id uuid, p_limit integer)
RETURNS TABLE(id uuid, score double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH matches AS (
  SELECT p.id, CASE p_sort WHEN 'price_low' THEN -p.price WHEN 'price_high' THEN p.price ELSE 0 END::double precision AS score
  FROM products p
  WHERE p.store_id=p_store AND p.approval_status='approved' AND p.quick_tab_key IS NULL
   AND (p_category IS NULL OR p.category=p_category)
   AND (NOT p_veg OR p.is_veg IS TRUE)
   AND (NOT p_deals OR p.original_price>p.price)
   AND CASE p_price_band WHEN 'under_100' THEN p.price<100 WHEN '100_300' THEN p.price BETWEEN 100 AND 300
        WHEN 'above_300' THEN p.price>300 ELSE true END)
 SELECT m.id,m.score FROM matches m WHERE p_after_score IS NULL OR (m.score,m.id)<(p_after_score,p_after_id)
 ORDER BY m.score DESC,m.id DESC LIMIT least(greatest(p_limit,1),61);
$$;

CREATE OR REPLACE FUNCTION public.store_category_facets(p_store uuid)
RETURNS TABLE(category text, product_count bigint, image_url text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p.category, count(*), (array_agg(p.image_url ORDER BY p.id) FILTER (WHERE p.image_url IS NOT NULL))[1]
 FROM products p WHERE p.store_id=p_store AND p.approval_status='approved' AND p.quick_tab_key IS NULL AND nullif(btrim(p.category),'') IS NOT NULL
 GROUP BY p.category ORDER BY p.category LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.popular_customer_product_ids(p_stores uuid[],p_days integer DEFAULT 7) RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT r.product_id FROM product_popularity_daily r JOIN products p ON p.id=r.product_id JOIN stores s ON s.id=p.store_id
 WHERE r.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND r.day>=(now() AT TIME ZONE 'Asia/Kolkata')::date-least(greatest(p_days,1),30)
 AND p.approval_status='approved' AND p.quick_tab_key IS NULL
 GROUP BY r.product_id ORDER BY sum(r.quantity) DESC,r.product_id LIMIT 30;
$$;

CREATE OR REPLACE FUNCTION public.deal_customer_product_ids(p_stores uuid[], p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p.id FROM products p
 WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND p.approval_status='approved' AND p.quick_tab_key IS NULL
  AND p.original_price > p.price AND p.price > 0
 ORDER BY (p.original_price-p.price)/p.original_price DESC, p.id LIMIT least(greatest(p_limit,1),30);
$$;

CREATE OR REPLACE FUNCTION public.browse_customer_product_ids(p_stores uuid[],p_category uuid,p_subcategory uuid,p_type text,p_brand text,p_veg boolean,p_deals boolean,p_sort text,p_after_score double precision,p_after_id uuid,p_limit integer)
RETURNS TABLE(id uuid,score double precision) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH matches AS(SELECT p.id,CASE p_sort WHEN 'price-low' THEN -p.price WHEN 'price-high' THEN p.price
  WHEN 'discount' THEN CASE WHEN p.original_price>p.price THEN (p.original_price-p.price)/p.original_price ELSE 0 END ELSE 0 END::double precision score
 FROM products p JOIN stores s ON s.id=p.store_id JOIN sub_categories c ON c.id=p.sub_category_id
 WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND p.approval_status='approved' AND p.quick_tab_key IS NULL
 AND c.is_active AND (p_category IS NULL OR c.category_id=p_category) AND (p_subcategory IS NULL OR c.id=p_subcategory)
 AND (p_type='' OR lower(p.category)=p_type) AND (p_brand='' OR p.brand_name=p_brand) AND (NOT p_veg OR p.is_veg) AND (NOT p_deals OR p.original_price>p.price))
 SELECT m.id,m.score FROM matches m WHERE p_after_score IS NULL OR (m.score,m.id)<(p_after_score,p_after_id)
 ORDER BY m.score DESC,m.id DESC LIMIT least(greatest(p_limit,1),61);
$$;

CREATE OR REPLACE FUNCTION public.customer_category_facets(p_stores uuid[],p_category uuid,p_subcategory uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH available AS(SELECT p.category,p.brand_name FROM products p JOIN stores s ON s.id=p.store_id JOIN sub_categories c ON c.id=p.sub_category_id
 WHERE p.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND p.approval_status='approved' AND p.quick_tab_key IS NULL AND c.is_active
 AND (p_category IS NULL OR c.category_id=p_category) AND (p_subcategory IS NULL OR c.id=p_subcategory))
 SELECT jsonb_build_object('types',coalesce((SELECT jsonb_agg(category ORDER BY category) FROM(SELECT DISTINCT category FROM available WHERE category IS NOT NULL LIMIT 100)t),'[]'::jsonb),
 'brands',coalesce((SELECT jsonb_agg(brand_name ORDER BY brand_name) FROM(SELECT DISTINCT brand_name FROM available WHERE brand_name IS NOT NULL LIMIT 100)b),'[]'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.home_pick_product_ids(p_stores uuid[], p_now timestamptz DEFAULT now())
RETURNS TABLE(section_key text, id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT hp.section_key, p.id
  FROM home_section_products hp
  JOIN home_sections s ON s.key = hp.section_key
  JOIN products p ON p.id = hp.product_id
  WHERE cardinality(p_stores) <= 20 AND p.store_id = ANY(p_stores) AND p.approval_status = 'approved' AND p.quick_tab_key IS NULL
    AND s.enabled AND (s.starts_at IS NULL OR s.starts_at <= p_now) AND (s.ends_at IS NULL OR s.ends_at > p_now)
  ORDER BY hp.section_key, hp.position, p.id;
$$;

CREATE OR REPLACE FUNCTION public.home_section_preview_ids(p_stores uuid[], p_now timestamptz DEFAULT now())
RETURNS TABLE(section_key text, id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH live_sections AS (
    SELECT s.key, s.source_category_id
    FROM home_sections s
    WHERE cardinality(p_stores) BETWEEN 1 AND 20
      AND s.enabled AND (s.starts_at IS NULL OR s.starts_at <= p_now)
      AND (s.ends_at IS NULL OR s.ends_at > p_now)
  ), section_products AS (
    SELECT hp.section_key, p.id, hp.position::bigint AS position
    FROM live_sections s
    JOIN home_section_products hp ON hp.section_key = s.key
    JOIN products p ON p.id = hp.product_id
    WHERE s.source_category_id IS NULL AND p.store_id = ANY(p_stores) AND p.approval_status = 'approved' AND p.quick_tab_key IS NULL
    UNION ALL
    SELECT s.key, preview.id, row_number() OVER (PARTITION BY s.key ORDER BY preview.id DESC)
    FROM live_sections s
    JOIN categories c ON c.id = s.source_category_id AND c.is_active
    CROSS JOIN LATERAL (
      SELECT p.id
      FROM sub_categories sub
      JOIN products p ON p.sub_category_id = sub.id
      WHERE sub.category_id = c.id AND sub.is_active
        AND p.store_id = ANY(p_stores) AND p.approval_status = 'approved' AND p.quick_tab_key IS NULL AND NOT p.preorder_enabled
        AND p.is_in_stock AND p.stock_status <> 'out_of_stock'
        AND p.stock_tracking_enabled AND p.stock_quantity > 0
        AND (
          EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.stock_quantity > 0)
          OR (SELECT count(*) FROM product_variants v WHERE v.product_id = p.id) <= 1
             AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.stock_quantity = 0)
        )
      ORDER BY p.id DESC
      LIMIT 7
    ) preview
  )
  SELECT sp.section_key, sp.id
  FROM section_products sp
  ORDER BY sp.section_key, sp.position, sp.id;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
