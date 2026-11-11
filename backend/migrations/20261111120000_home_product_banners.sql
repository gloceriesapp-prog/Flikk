BEGIN;
SET LOCAL lock_timeout = '5s';
-- PostgreSQL names the original multi-column check differently from a
-- single-column check. Resolve that specific existing constraint by its column.
DO $$
DECLARE old_name text; matched integer;
BEGIN
  SELECT min(c.conname), count(*) INTO old_name, matched
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.home_sections'::regclass AND c.contype = 'c'
    AND a.attname = 'banner_image_url';
  IF matched <> 1 THEN RAISE EXCEPTION 'Expected exactly one Home banner check, found %', matched; END IF;
  EXECUTE format('ALTER TABLE public.home_sections DROP CONSTRAINT %I', old_name);
END $$;
ALTER TABLE public.home_sections ADD CONSTRAINT home_sections_banner_image_url_check
  CHECK (banner_image_url IS NULL OR (
    (key IN ('preorders', 'price-drops', 'everyday-dairy', 'trending', 'most-bought',
             'deals-for-you', 'todays-best-deals', 'everyday-essentials')
      OR key ~ '^custom-[a-z0-9]{6,32}$')
    AND banner_image_url LIKE 'https://%' AND length(banner_image_url) <= 2048
  ));
COMMIT;
