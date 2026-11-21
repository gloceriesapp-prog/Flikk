-- The cut-out product on a transparent background (no frame), saved by the
-- worker next to the framed result_url. Admin picks from these for places
-- that show a product on their own colour (Home "NEW for you" tile).
ALTER TABLE public.product_image_jobs
  ADD COLUMN IF NOT EXISTS cutout_url text CHECK (cutout_url IS NULL OR cutout_url LIKE 'https://%');
