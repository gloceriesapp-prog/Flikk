-- Product photo gallery (2026-11-04).
--
-- image_url stays the cover photo: carts, order snapshots, partner review and
-- every list keep reading it unchanged. extra_image_urls holds the further
-- photos, in display order, set from admin's product form. Customer feeds
-- select products.* so the column reaches the app with no route change.
-- Up to 7 extras (8 photos in all); no NULL entries.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS extra_image_urls text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_extra_image_urls_check;
ALTER TABLE public.products ADD CONSTRAINT products_extra_image_urls_check
  CHECK (cardinality(extra_image_urls) <= 7 AND array_position(extra_image_urls, NULL) IS NULL);

NOTIFY pgrst, 'reload schema';
