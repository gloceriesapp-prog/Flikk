-- Explicit Admin style changes can restore the Standard cut-out. Background
-- workers still cannot overwrite a retained original through direct updates.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.protect_original_product_image()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.image_url IS DISTINCT FROM OLD.image_url
     AND product_image_is_original(OLD.image_url)
     AND current_setting('app.product_image_style_override', true) IS DISTINCT FROM OLD.id::text
     AND EXISTS (SELECT 1 FROM product_image_jobs j WHERE j.product_id = OLD.id
                 AND j.slot = 'main' AND j.result_url = NEW.image_url
                 AND j.original_url = OLD.image_url) THEN
    NEW.image_url := OLD.image_url;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_original_product_image() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_catalogue_product_with_image_style(
  p_product uuid, p_store uuid, p_fields jsonb, p_variants jsonb, p_image_style text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE saved uuid; previous text := current_setting('app.product_image_style_override', true);
BEGIN
  IF p_product IS NULL OR p_image_style IS NULL OR p_image_style NOT IN ('none', 'standard') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0400', MESSAGE = 'Invalid product image style.';
  END IF;
  PERFORM set_config('app.product_image_style_override', p_product::text, true);
  -- Keep the existing catalogue validation, stock locks and transaction intact.
  saved := public.save_catalogue_product(p_product, p_store, p_fields, p_variants);
  PERFORM set_config('app.product_image_style_override', coalesce(previous, ''), true);
  RETURN saved;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.product_image_style_override', coalesce(previous, ''), true);
  RAISE;
END $$;
REVOKE ALL ON FUNCTION public.save_catalogue_product_with_image_style(uuid,uuid,jsonb,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_catalogue_product_with_image_style(uuid,uuid,jsonb,jsonb,text) TO service_role;
COMMIT;
