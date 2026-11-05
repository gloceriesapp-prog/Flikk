-- A pack with no store price (0) but an MRP sells at its MRP (one price, no
-- strike-through), at write time for every path: admin, partner, the
-- save_catalogue_product RPC and review approvals. Older app builds still send
-- 0 for a blank store price, which products_price_positive (20261106130000)
-- would otherwise reject. A row with neither price is still refused.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE OR REPLACE FUNCTION public.price_falls_back_to_mrp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 IF coalesce(NEW.price, 0) <= 0 AND NEW.original_price > 0 THEN
  NEW.price := NEW.original_price;
  NEW.original_price := NULL;
 END IF;
 RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS products_price_falls_back_to_mrp ON public.products;
CREATE TRIGGER products_price_falls_back_to_mrp BEFORE INSERT OR UPDATE OF price, original_price ON public.products
 FOR EACH ROW EXECUTE FUNCTION public.price_falls_back_to_mrp();
DROP TRIGGER IF EXISTS product_variants_price_falls_back_to_mrp ON public.product_variants;
CREATE TRIGGER product_variants_price_falls_back_to_mrp BEFORE INSERT OR UPDATE OF price, original_price ON public.product_variants
 FOR EACH ROW EXECUTE FUNCTION public.price_falls_back_to_mrp();

COMMIT;
NOTIFY pgrst, 'reload schema';
