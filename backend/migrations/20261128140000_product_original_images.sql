-- Explicitly displaying a retained upload means None / keep original.
-- Source URLs used behind standard fitted photos still receive normal cut-outs.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.product_image_is_original(p_url text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT coalesce(p_url LIKE 'https://%/products/0f1a2b3c-0000-4000-8000-0000000a11c0/%', false);
$$;
REVOKE ALL ON FUNCTION public.product_image_is_original(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_image_is_original(text) TO service_role;

CREATE OR REPLACE FUNCTION public.product_image_is_new(p_url text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_url LIKE 'https://%' AND NOT product_image_is_original(p_url) AND NOT EXISTS (
    SELECT 1 FROM product_image_jobs WHERE result_url = p_url OR original_url = p_url OR original_url = product_image_source(p_url));
$$;
REVOKE ALL ON FUNCTION public.product_image_is_new(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.queue_product_image_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE url text;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    UPDATE product_image_jobs SET status = 'failed', error = 'Replaced by a newer photo.', updated_at = now()
      WHERE product_id = NEW.id AND slot = 'main' AND status IN ('queued', 'processing');
    IF NEW.image_url IS NOT NULL AND product_image_is_new(NEW.image_url) THEN
      INSERT INTO product_image_jobs (product_id, slot, original_url) VALUES (NEW.id, 'main', product_image_source(NEW.image_url));
    END IF;
  END IF;
  FOREACH url IN ARRAY coalesce(NEW.extra_image_urls, '{}') LOOP
    IF (TG_OP = 'INSERT' OR NOT url = ANY (coalesce(OLD.extra_image_urls, '{}'))) AND product_image_is_new(url) THEN
      INSERT INTO product_image_jobs (product_id, slot, original_url) VALUES (NEW.id, 'extra', product_image_source(url)) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_product_image_job() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.replace_product_extra_image(p_product uuid, p_from text[], p_to text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE current_url text; current_urls text[];
BEGIN
  -- Lock while deciding, so a background result cannot win over a None selection.
  SELECT extra_image_urls INTO current_urls FROM products WHERE id = p_product FOR UPDATE;
  SELECT u INTO current_url FROM unnest(current_urls) u WHERE u = ANY (p_from) LIMIT 1;
  IF current_url IS NULL OR product_image_is_original(current_url)
     OR p_to = ANY (current_urls) THEN RETURN false; END IF;
  UPDATE products SET extra_image_urls = array_replace(extra_image_urls, current_url, p_to) WHERE id = p_product;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.replace_product_extra_image(uuid, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_product_extra_image(uuid, text[], text) TO service_role;

-- Feature probe: older databases leave None disabled instead of losing artwork.
CREATE OR REPLACE FUNCTION public.product_original_images_enabled()
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$ SELECT true; $$;
REVOKE ALL ON FUNCTION public.product_original_images_enabled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_original_images_enabled() TO service_role;
COMMIT;
