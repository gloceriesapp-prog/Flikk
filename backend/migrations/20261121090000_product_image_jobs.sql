-- Product photo cut-out queue (workers/image-cutout). A new or changed
-- products.image_url queues one job; the Python worker claims it through the
-- admin app, removes the background and fits the product into the 720x810
-- frame. The product stays live on its uploaded photo the whole time.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- The untouched upload behind a fitted product photo (admin /api/upload).
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS source_url text CHECK (source_url IS NULL OR source_url LIKE 'https://%');

CREATE TABLE public.product_image_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  original_url text NOT NULL CHECK (original_url LIKE 'https://%'),
  result_url text CHECK (result_url IS NULL OR result_url LIKE 'https://%'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'done', 'needs_review', 'failed')),
  reason text CHECK (reason IS NULL OR reason IN ('cut-out quality', 'low resolution', 'too small')),
  -- bria-rmbg is deliberately absent: non-commercial licence.
  model text NOT NULL DEFAULT 'isnet-general-use' CHECK (model IN ('isnet-general-use', 'birefnet-general')),
  quality jsonb,
  attempts integer NOT NULL DEFAULT 0,
  error text,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_image_jobs_one_open ON public.product_image_jobs (product_id) WHERE status IN ('queued', 'processing');
CREATE INDEX product_image_jobs_status ON public.product_image_jobs (status, created_at);
CREATE INDEX product_image_jobs_result ON public.product_image_jobs (result_url) WHERE result_url IS NOT NULL;
CREATE INDEX product_image_jobs_original ON public.product_image_jobs (original_url);

ALTER TABLE public.product_image_jobs ENABLE ROW LEVEL SECURITY;
-- No policies: only the admin app's service-role client reads or writes jobs.

-- Queue a job when a product gets a photo the pipeline has not seen. Its own
-- write-back (a job's result_url) and a photo already decided on (a job's
-- original_url, e.g. "Use original") never queue again.
CREATE OR REPLACE FUNCTION public.queue_product_image_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.image_url IS NULL OR NEW.image_url NOT LIKE 'https://%' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM product_image_jobs WHERE result_url = NEW.image_url OR original_url = NEW.image_url) THEN RETURN NEW; END IF;
  UPDATE product_image_jobs SET status = 'failed', error = 'Replaced by a newer photo.', updated_at = now()
   WHERE product_id = NEW.id AND status IN ('queued', 'processing');
  INSERT INTO product_image_jobs (product_id, original_url)
  VALUES (NEW.id, coalesce((SELECT source_url FROM media_assets WHERE public_url = NEW.image_url AND source_url IS NOT NULL LIMIT 1), NEW.image_url));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_product_image_job() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER queue_product_image_job
AFTER INSERT OR UPDATE OF image_url ON public.products
FOR EACH ROW EXECUTE FUNCTION public.queue_product_image_job();

-- One job for one worker: oldest queued first, or one whose worker died
-- (claimed over 10 minutes ago). After 3 attempts it stops being retried.
CREATE OR REPLACE FUNCTION public.claim_product_image_job()
RETURNS SETOF public.product_image_jobs LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE product_image_jobs SET status = 'failed', error = 'Gave up after 3 attempts.', updated_at = now()
   WHERE status = 'processing' AND claimed_at < now() - interval '10 minutes' AND attempts >= 3;
  UPDATE product_image_jobs j SET status = 'processing', claimed_at = now(), attempts = j.attempts + 1, updated_at = now()
   WHERE j.id = (
     SELECT id FROM product_image_jobs
      WHERE status = 'queued' OR (status = 'processing' AND claimed_at < now() - interval '10 minutes')
      ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
  RETURNING j.*;
$$;
REVOKE ALL ON FUNCTION public.claim_product_image_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_product_image_job() TO service_role;

COMMIT;
