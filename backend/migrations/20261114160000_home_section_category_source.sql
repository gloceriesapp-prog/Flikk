-- A category source supersedes the saved manual picks without deleting them.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.home_sections
  ADD COLUMN source_category_id uuid,
  ADD CONSTRAINT home_sections_source_category_fk FOREIGN KEY (source_category_id) REFERENCES public.categories(id),
  ADD CONSTRAINT home_sections_source_product_rail_check
    CHECK (source_category_id IS NULL OR public.home_section_accepts_products(key));

CREATE INDEX home_sections_source_category_idx ON public.home_sections(source_category_id)
  WHERE source_category_id IS NOT NULL;

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
    WHERE s.source_category_id IS NULL AND p.store_id = ANY(p_stores) AND p.approval_status = 'approved'
    UNION ALL
    SELECT s.key, preview.id, row_number() OVER (PARTITION BY s.key ORDER BY preview.id DESC)
    FROM live_sections s
    JOIN categories c ON c.id = s.source_category_id AND c.is_active
    CROSS JOIN LATERAL (
      SELECT p.id
      FROM sub_categories sub
      JOIN products p ON p.sub_category_id = sub.id
      WHERE sub.category_id = c.id AND sub.is_active
        AND p.store_id = ANY(p_stores) AND p.approval_status = 'approved' AND NOT p.preorder_enabled
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

REVOKE ALL ON FUNCTION public.home_section_preview_ids(uuid[], timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.home_section_preview_ids(uuid[], timestamptz) TO service_role;

COMMIT;
