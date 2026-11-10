ALTER TABLE public.home_sections
  ADD COLUMN banner_image_url text
    CHECK (banner_image_url IS NULL OR (key = 'preorders' AND banner_image_url LIKE 'https://%' AND length(banner_image_url) <= 2048));
