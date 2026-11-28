-- Preserve Premium exclusions and protect None photos while older Admin workers
-- are still deployed. Worker outputs are recorded before publishing to products.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.product_image_is_new(p_url text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_url LIKE 'https://%' AND NOT product_image_is_original(p_url) AND NOT EXISTS (
    SELECT 1 FROM product_image_jobs WHERE result_url = p_url OR original_url = p_url OR original_url = product_image_source(p_url))
  AND NOT EXISTS (SELECT 1 FROM product_premium_images WHERE url = p_url);
$$;
REVOKE ALL ON FUNCTION public.product_image_is_new(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_original_product_image()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.image_url IS DISTINCT FROM OLD.image_url
     AND product_image_is_original(OLD.image_url)
     AND EXISTS (SELECT 1 FROM product_image_jobs j WHERE j.product_id = OLD.id
                 AND j.slot = 'main' AND j.result_url = NEW.image_url
                 AND j.original_url = OLD.image_url) THEN
    -- Leave the retained original in place; allow unrelated fields to save.
    NEW.image_url := OLD.image_url;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_original_product_image() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_original_product_image ON public.products;
CREATE TRIGGER protect_original_product_image
BEFORE UPDATE OF image_url ON public.products
FOR EACH ROW EXECUTE FUNCTION public.protect_original_product_image();
COMMIT;
