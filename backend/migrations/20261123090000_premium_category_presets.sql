-- Premium background: category presets, where the premium photo shows, and
-- which home sections use it as the card image.
-- - preset: the category presets (lib/photoroomPresets.ts) join the list.
-- - prompt: the first part of the background prompt the admin sent (a
--   preset's text or their edit); the fixed safety text is added in code.
-- - products.premium_image_url: the premium photo the admin picked. The
--   rembg photo stays the main image unless the admin chose "Main photo";
--   by default the premium photo is the second gallery photo
--   (extra_image_urls[0]).
-- - home_sections.use_premium_images: that section's cards show the premium
--   photo when a product has one (hero rails, Coastal, festival). Off by
--   default, so grids keep the rembg photo.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.product_premium_images
  DROP CONSTRAINT product_premium_images_preset_check,
  ADD CONSTRAINT product_premium_images_preset_check CHECK (preset IN (
    'fruits_veg', 'dairy', 'meat_fish', 'coastal', 'staples', 'masala', 'snacks', 'beverages', 'bakery', 'frozen',
    'personal_care', 'household', 'baby', 'festival', 'studio', 'marble', 'wood', 'pastel', 'kitchen', 'text')),
  ADD COLUMN IF NOT EXISTS prompt text CHECK (prompt IS NULL OR char_length(prompt) BETWEEN 3 AND 200);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS premium_image_url text CHECK (premium_image_url IS NULL OR premium_image_url LIKE 'https://%');

ALTER TABLE public.home_sections
  ADD COLUMN IF NOT EXISTS use_premium_images boolean NOT NULL DEFAULT false;

COMMIT;
