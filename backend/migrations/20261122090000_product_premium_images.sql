-- Optional "Premium background" product photos made with Photoroom (admin
-- only, one product at a time, never in batch). Each Generate is one row;
-- the product shows a premium photo only when the admin picks it
-- (products.image_url = that row's url). The rembg cut-out pipeline is
-- unchanged: its result stays in product_image_jobs and switching back puts
-- it on the product again.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.product_premium_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  preset text NOT NULL CHECK (preset IN ('studio', 'marble', 'wood', 'pastel', 'kitchen', 'coastal')),
  color text CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  status text NOT NULL CHECK (status IN ('done', 'failed')),
  url text CHECK (url IS NULL OR url LIKE 'https://%'),
  error text,
  -- The standard (rembg) photo the product showed when this was generated,
  -- the fallback for switching back.
  standard_url text CHECK (standard_url IS NULL OR standard_url LIKE 'https://%'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'done') = (url IS NOT NULL))
);
CREATE INDEX product_premium_images_product ON public.product_premium_images (product_id, created_at DESC);
CREATE INDEX product_premium_images_month ON public.product_premium_images (created_at) WHERE status = 'done';
CREATE INDEX product_premium_images_url ON public.product_premium_images (url) WHERE url IS NOT NULL;
ALTER TABLE public.product_premium_images ENABLE ROW LEVEL SECURITY;
-- No policies: only the admin app's service-role client reads or writes.

-- One row: the monthly cap on Photoroom images (about $0.10 each).
CREATE TABLE public.photoroom_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  monthly_cap integer NOT NULL DEFAULT 300 CHECK (monthly_cap BETWEEN 0 AND 100000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.photoroom_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.photoroom_settings ENABLE ROW LEVEL SECURITY;

-- A premium photo put on a product is not a new upload: the cut-out queue
-- must not pick it up. Same checks as before, plus that one.
CREATE OR REPLACE FUNCTION public.product_image_is_new(p_url text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_url LIKE 'https://%' AND NOT EXISTS (
    SELECT 1 FROM product_image_jobs WHERE result_url = p_url OR original_url = p_url OR original_url = product_image_source(p_url))
  AND NOT EXISTS (SELECT 1 FROM product_premium_images WHERE url = p_url);
$$;
REVOKE ALL ON FUNCTION public.product_image_is_new(text) FROM PUBLIC, anon, authenticated;

COMMIT;
