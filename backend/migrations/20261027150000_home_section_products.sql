-- Hand-picked products on the Home "All" tab.
--
-- 1. home_section_products: the founder pins products to a product rail
--    (Trending, Most Bought, the deal rows, Everyday Essentials) or to a
--    custom section, in a set order. Pinned products show first; the rail's
--    automatic products fill the rest unless the section is "pinned only".
-- 2. home_sections gains:
--      is_custom    — a founder-made product section (key custom-xxxxxx),
--                     always shows only its pinned products;
--      pinned_only  — a built-in rail shows its pinned products and nothing
--                     automatic;
--      starts_at / ends_at — optional schedule (Diwali rail, weekend offer).
-- 3. Two service-role RPCs write pins atomically:
--      admin_set_home_section_products(key, ids[]) — the Home Sections picker,
--      admin_set_product_home_sections(product, keys[]) — Inventory's
--      "Show on home", which appends to the end of each newly chosen section.
-- 4. home_pick_product_ids(stores[], now) — what the customer app shows:
--    pins in live sections, approved products, only from stores that deliver
--    to the customer, in pin order.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.home_sections
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.home_sections DROP CONSTRAINT IF EXISTS home_sections_custom_key_check;
ALTER TABLE public.home_sections ADD CONSTRAINT home_sections_custom_key_check
  CHECK (is_custom = (key ~ '^custom-[a-z0-9]{6,32}$'));
ALTER TABLE public.home_sections DROP CONSTRAINT IF EXISTS home_sections_schedule_check;
ALTER TABLE public.home_sections ADD CONSTRAINT home_sections_schedule_check
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at);

-- The rails that are lists of products. Everything else (stores, categories,
-- banners) has its own admin screen.
CREATE OR REPLACE FUNCTION public.home_section_accepts_products(p_key text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_key IN ('trending','most-bought','deals-for-you','todays-best-deals','price-drops','everyday-essentials')
      OR p_key ~ '^custom-[a-z0-9]{6,32}$';
$$;

CREATE TABLE IF NOT EXISTS public.home_section_products (
  section_key text NOT NULL REFERENCES public.home_sections(key) ON UPDATE CASCADE ON DELETE CASCADE
    CHECK (public.home_section_accepts_products(section_key)),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (section_key, product_id)
);
CREATE INDEX IF NOT EXISTS home_section_products_product_idx ON public.home_section_products(product_id);
CREATE INDEX IF NOT EXISTS home_section_products_order_idx ON public.home_section_products(section_key, position);
ALTER TABLE public.home_section_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.home_section_products FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_section_products TO service_role;

-- A rail shows a handful of cards; 30 pins is already more than any screen.
CREATE OR REPLACE FUNCTION public.admin_set_home_section_products(p_key text, p_product_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ids uuid[] := coalesce(p_product_ids, '{}');
BEGIN
  IF NOT public.home_section_accepts_products(p_key) OR NOT EXISTS (SELECT 1 FROM home_sections WHERE key = p_key) THEN
    RAISE EXCEPTION USING errcode = 'P0404', message = 'This section does not take products.';
  END IF;
  IF cardinality(ids) > 30 THEN
    RAISE EXCEPTION USING errcode = 'P0400', message = 'A section can pin at most 30 products.';
  END IF;
  IF cardinality(ids) <> (SELECT count(DISTINCT x) FROM unnest(ids) x) THEN
    RAISE EXCEPTION USING errcode = 'P0400', message = 'A product can be pinned only once per section.';
  END IF;
  IF (SELECT count(*) FROM products WHERE id = ANY(ids)) <> cardinality(ids) THEN
    RAISE EXCEPTION USING errcode = 'P0404', message = 'A pinned product no longer exists.';
  END IF;
  PERFORM 1 FROM home_sections WHERE key = p_key FOR UPDATE;
  DELETE FROM home_section_products WHERE section_key = p_key;
  INSERT INTO home_section_products(section_key, product_id, position)
  SELECT p_key, x.id, x.ord - 1 FROM unnest(ids) WITH ORDINALITY AS x(id, ord);
  RETURN cardinality(ids);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_product_home_sections(p_product uuid, p_keys text[])
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE keys text[] := coalesce(p_keys, '{}'); v_key text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product) THEN
    RAISE EXCEPTION USING errcode = 'P0404', message = 'Product not found.';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(keys) AS wanted(section) WHERE NOT public.home_section_accepts_products(wanted.section)
             OR NOT EXISTS (SELECT 1 FROM home_sections s WHERE s.key = wanted.section)) THEN
    RAISE EXCEPTION USING errcode = 'P0404', message = 'One of these sections does not take products.';
  END IF;
  PERFORM 1 FROM home_sections WHERE key = ANY(keys) ORDER BY key FOR UPDATE;
  DELETE FROM home_section_products WHERE product_id = p_product AND NOT (section_key = ANY(keys));
  FOREACH v_key IN ARRAY keys LOOP
    IF NOT EXISTS (SELECT 1 FROM home_section_products WHERE section_key = v_key AND product_id = p_product) THEN
      IF (SELECT count(*) FROM home_section_products WHERE section_key = v_key) >= 30 THEN
        RAISE EXCEPTION USING errcode = 'P0400', message = 'A section can pin at most 30 products.';
      END IF;
      INSERT INTO home_section_products(section_key, product_id, position)
      SELECT v_key, p_product, coalesce(max(position) + 1, 0) FROM home_section_products WHERE section_key = v_key;
    END IF;
  END LOOP;
  RETURN ARRAY(SELECT section_key FROM home_section_products WHERE product_id = p_product ORDER BY section_key);
END $$;

-- Customer side: pins of sections that are switched on and inside their
-- schedule, approved products in the customer's delivery stores, in order.
CREATE OR REPLACE FUNCTION public.home_pick_product_ids(p_stores uuid[], p_now timestamptz DEFAULT now())
RETURNS TABLE(section_key text, id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT hp.section_key, p.id
  FROM home_section_products hp
  JOIN home_sections s ON s.key = hp.section_key
  JOIN products p ON p.id = hp.product_id
  WHERE cardinality(p_stores) <= 20 AND p.store_id = ANY(p_stores) AND p.approval_status = 'approved'
    AND s.enabled AND (s.starts_at IS NULL OR s.starts_at <= p_now) AND (s.ends_at IS NULL OR s.ends_at > p_now)
  ORDER BY hp.section_key, hp.position, p.id;
$$;

REVOKE ALL ON FUNCTION public.admin_set_home_section_products(text, uuid[]),
  public.admin_set_product_home_sections(uuid, text[]),
  public.home_pick_product_ids(uuid[], timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_home_section_products(text, uuid[]),
  public.admin_set_product_home_sections(uuid, text[]),
  public.home_pick_product_ids(uuid[], timestamptz) TO service_role;

COMMIT;
