-- Home picks follow-up to 20261027150000.
-- 1. Everyday Dairy takes hand-picked products too (it shows them before its
--    name-matched dairy products).
-- 2. products.created_at, so Everyday Essentials can show the newest
--    products first: a product the founder just uploaded appears on Home
--    without any extra step. Existing rows all get the migration time.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE OR REPLACE FUNCTION public.home_section_accepts_products(p_key text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_key IN ('trending','most-bought','deals-for-you','todays-best-deals','price-drops','everyday-essentials','everyday-dairy')
      OR p_key ~ '^custom-[a-z0-9]{6,32}$';
$$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS products_approved_newest_idx ON public.products(store_id, created_at DESC) WHERE approval_status = 'approved';

COMMIT;
