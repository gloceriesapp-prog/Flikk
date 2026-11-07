-- A pack sells at its store price, or at its MRP when no store price was
-- entered (admin productValidation.ts / backend lib/products.ts sellingPrice).
-- Repair packs saved at 0 with an MRP, then refuse a price of 0 or less so a
-- product can never be sold free by mistake.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

UPDATE public.product_variants SET price = original_price, original_price = NULL
 WHERE price <= 0 AND original_price > 0;
UPDATE public.products SET price = original_price, original_price = NULL
 WHERE price <= 0 AND original_price > 0;

ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_price_positive;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_price_positive CHECK (price > 0);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_positive;
ALTER TABLE public.products ADD CONSTRAINT products_price_positive CHECK (price > 0);

COMMIT;
NOTIFY pgrst, 'reload schema';
