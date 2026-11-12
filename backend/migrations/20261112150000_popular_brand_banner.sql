BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.brands ADD COLUMN popular_banner_url text,
  ADD CONSTRAINT brands_popular_banner_https CHECK (
    popular_banner_url IS NULL OR
    (length(popular_banner_url) <= 2048 AND popular_banner_url ~ '^https://[^[:space:]]+$')
  );
COMMIT;
