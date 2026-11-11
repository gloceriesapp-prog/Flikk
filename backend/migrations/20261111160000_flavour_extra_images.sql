-- Each flavour keeps its cover plus up to seven ordered gallery photos.
-- Deploy before the API/admin selectors that read this new column.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE public.product_options ADD COLUMN IF NOT EXISTS extra_image_urls text[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.product_option_images_valid(cover_photo text, extra_photos text[])
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT extra_photos IS NOT NULL
    AND cardinality(extra_photos) <= 7
    AND coalesce(array_ndims(extra_photos), 1) = 1
    AND array_position(extra_photos, NULL) IS NULL
    AND (cardinality(extra_photos) = 0 OR nullif(btrim(cover_photo), '') IS NOT NULL)
    AND NOT EXISTS (
      SELECT 1 FROM unnest(extra_photos) AS photo(url)
      WHERE length(url) > 2048 OR url !~* '^https?://'
    );
$$;
REVOKE ALL ON FUNCTION public.product_option_images_valid(text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_option_images_valid(text, text[]) TO service_role;
ALTER TABLE public.product_options ADD CONSTRAINT product_options_gallery_check
  CHECK (public.product_option_images_valid(image_url, extra_image_urls));
COMMIT;
