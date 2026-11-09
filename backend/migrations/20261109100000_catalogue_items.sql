-- Master item list (the supermarket catalogue sheet): every item the stores
-- may sell, filed under a sidebar sub-category, with no store, price or stock.
-- It is not a product: admin picks an item when adding a real product (the
-- name and sub-category fill in), and the item counts as added once a product
-- is linked to it. Never read by the customer or partner apps.
--
-- Items with no sub-category yet ("needs category") have sub_category_id NULL.
-- A live (approved) product must have a photo, so photo-less items can never
-- reach the customer or partner apps.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';

CREATE TABLE IF NOT EXISTS public.catalogue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CONSTRAINT catalogue_items_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  sub_category_id uuid REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- One item per name within a sub-category (or among the uncategorised), so
-- re-running the import never duplicates anything.
CREATE UNIQUE INDEX IF NOT EXISTS catalogue_items_name_unique
  ON public.catalogue_items (coalesce(sub_category_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)));
CREATE INDEX IF NOT EXISTS catalogue_items_sub_category_idx ON public.catalogue_items (sub_category_id);
-- Fast "contains" search for the admin product-name suggestions.
CREATE INDEX IF NOT EXISTS catalogue_items_name_trgm ON public.catalogue_items USING gin (name extensions.gin_trgm_ops);

-- Admin-only (service role). No customer or partner access.
ALTER TABLE public.catalogue_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogue_items FROM anon, authenticated;

-- Which master item a product was added from.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS catalogue_item_id uuid REFERENCES public.catalogue_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS products_catalogue_item_idx ON public.products (catalogue_item_id) WHERE catalogue_item_id IS NOT NULL;

-- A live product always has a photo.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_live_needs_photo;
ALTER TABLE public.products ADD CONSTRAINT products_live_needs_photo
  CHECK (approval_status IS DISTINCT FROM 'approved' OR nullif(btrim(image_url), '') IS NOT NULL);

-- Admin's "Pending items" view: each item with where it is filed and whether
-- a product has been added from it yet.
CREATE OR REPLACE VIEW public.catalogue_item_status WITH (security_invoker = true) AS
SELECT ci.id, ci.name, ci.sub_category_id, sc.name AS sub_category_name,
       c.id AS category_id, c.name AS category_name, s.id AS section_id, s.name AS section_name,
       EXISTS (SELECT 1 FROM public.products p WHERE p.catalogue_item_id = ci.id) AS added
FROM public.catalogue_items ci
LEFT JOIN public.sub_categories sc ON sc.id = ci.sub_category_id
LEFT JOIN public.categories c ON c.id = sc.category_id
LEFT JOIN public.category_sections s ON s.id = c.section_id;
REVOKE ALL ON public.catalogue_item_status FROM anon, authenticated;

-- Pending-items summary per main section ('Needs category' for unfiled
-- items): how many items, and how many already have a product.
CREATE OR REPLACE FUNCTION public.catalogue_progress()
RETURNS TABLE (section_name text, total bigint, added bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(section_name, 'Needs category'), count(*), count(*) FILTER (WHERE added)
  FROM public.catalogue_item_status GROUP BY 1 ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.catalogue_progress() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalogue_progress() TO service_role;

COMMIT;
