-- Brands (Amul, Cadbury, Comfort, ...): a product can belong to one brand, so
-- the apps can show "Comfort · Explore all products" and list a brand's
-- products across stores. Created and picked from the admin product form.
-- Optional on purpose: loose produce and local items have no brand.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CONSTRAINT brands_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- One row per brand, whatever the spelling case ("amul" = "Amul").
CREATE UNIQUE INDEX IF NOT EXISTS brands_name_unique ON public.brands (lower(btrim(name)));

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
-- Customers and partners read active brands; writes go through the admin's
-- service-role API only.
DROP POLICY IF EXISTS brands_read_active ON public.brands;
CREATE POLICY brands_read_active ON public.brands FOR SELECT TO authenticated, anon USING (is_active);
GRANT SELECT ON public.brands TO authenticated, anon;

-- Deleting a brand leaves its products in place, just unbranded.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products (brand_id) WHERE brand_id IS NOT NULL;

COMMIT;
