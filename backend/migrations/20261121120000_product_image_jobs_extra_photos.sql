-- Extra product photos (products.extra_image_urls) get the same cut-out as
-- the main photo. Each photo is its own job: slot 'main' swaps
-- products.image_url, slot 'extra' swaps that one URL inside
-- extra_image_urls in place (replace_product_extra_image).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.product_image_jobs
  ADD COLUMN IF NOT EXISTS slot text NOT NULL DEFAULT 'main' CHECK (slot IN ('main', 'extra'));

-- One open job per main photo, and one per extra photo.
DROP INDEX IF EXISTS public.product_image_jobs_one_open;
CREATE UNIQUE INDEX product_image_jobs_one_open_main ON public.product_image_jobs (product_id)
  WHERE status IN ('queued', 'processing') AND slot = 'main';
CREATE UNIQUE INDEX product_image_jobs_one_open_extra ON public.product_image_jobs (product_id, original_url)
  WHERE status IN ('queued', 'processing') AND slot = 'extra';

-- The untouched original behind an uploaded photo, else the photo itself.
CREATE OR REPLACE FUNCTION public.product_image_source(p_url text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce((SELECT source_url FROM media_assets WHERE public_url = p_url AND source_url IS NOT NULL LIMIT 1), p_url);
$$;
REVOKE ALL ON FUNCTION public.product_image_source(text) FROM PUBLIC, anon, authenticated;

-- A photo the pipeline has not seen: not its own output, not already decided.
CREATE OR REPLACE FUNCTION public.product_image_is_new(p_url text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_url LIKE 'https://%' AND NOT EXISTS (
    SELECT 1 FROM product_image_jobs WHERE result_url = p_url OR original_url = p_url OR original_url = product_image_source(p_url));
$$;
REVOKE ALL ON FUNCTION public.product_image_is_new(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.queue_product_image_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE url text;
BEGIN
  -- Main photo: a newer photo replaces any open main job.
  IF NEW.image_url IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.image_url IS DISTINCT FROM OLD.image_url)
     AND product_image_is_new(NEW.image_url) THEN
    UPDATE product_image_jobs SET status = 'failed', error = 'Replaced by a newer photo.', updated_at = now()
     WHERE product_id = NEW.id AND slot = 'main' AND status IN ('queued', 'processing');
    INSERT INTO product_image_jobs (product_id, slot, original_url) VALUES (NEW.id, 'main', product_image_source(NEW.image_url));
  END IF;
  -- Extra photos: each newly added URL gets its own job.
  FOREACH url IN ARRAY coalesce(NEW.extra_image_urls, '{}') LOOP
    IF (TG_OP = 'INSERT' OR NOT url = ANY (coalesce(OLD.extra_image_urls, '{}'))) AND product_image_is_new(url) THEN
      INSERT INTO product_image_jobs (product_id, slot, original_url) VALUES (NEW.id, 'extra', product_image_source(url))
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_product_image_job() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS queue_product_image_job ON public.products;
CREATE TRIGGER queue_product_image_job
AFTER INSERT OR UPDATE OF image_url, extra_image_urls ON public.products
FOR EACH ROW EXECUTE FUNCTION public.queue_product_image_job();

-- Swap one extra photo for its cleaned version, in place (order kept). Only
-- while the product still shows one of p_from, so a removed or replaced
-- photo is never brought back. Returns whether it swapped.
CREATE OR REPLACE FUNCTION public.replace_product_extra_image(p_product uuid, p_from text[], p_to text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE current_url text;
BEGIN
  SELECT u INTO current_url FROM products p, unnest(p.extra_image_urls) u
   WHERE p.id = p_product AND u = ANY (p_from) LIMIT 1;
  IF current_url IS NULL OR p_to = ANY ((SELECT extra_image_urls FROM products WHERE id = p_product)) THEN RETURN false; END IF;
  UPDATE products SET extra_image_urls = array_replace(extra_image_urls, current_url, p_to) WHERE id = p_product;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.replace_product_extra_image(uuid, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_product_extra_image(uuid, text[], text) TO service_role;

COMMIT;
