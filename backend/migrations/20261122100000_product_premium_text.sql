-- Premium "Text headline" style: the admin's own words drawn large at the
-- top of a plain background, the product placed over its lower part
-- (Photoroom static background + soft AI shadow).
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.product_premium_images
  DROP CONSTRAINT product_premium_images_preset_check,
  ADD CONSTRAINT product_premium_images_preset_check CHECK (preset IN ('studio', 'marble', 'wood', 'pastel', 'kitchen', 'coastal', 'text')),
  ADD COLUMN IF NOT EXISTS headline text CHECK (headline IS NULL OR char_length(headline) BETWEEN 1 AND 40),
  ADD COLUMN IF NOT EXISTS text_color text CHECK (text_color IS NULL OR text_color ~ '^#[0-9A-Fa-f]{6}$');
COMMIT;
