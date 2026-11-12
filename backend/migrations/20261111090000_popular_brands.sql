BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.brands
  ADD COLUMN popular_position smallint,
  ADD COLUMN popular_image_url text,
  ADD CONSTRAINT brands_popular_position_range CHECK (popular_position BETWEEN 1 AND 10),
  ADD CONSTRAINT brands_popular_position_unique UNIQUE (popular_position),
  ADD CONSTRAINT brands_popular_position_requires_image CHECK (
    popular_position IS NULL OR COALESCE(popular_image_url, logo_url, '') ~ '^https://[^[:space:]]+$'
  );

COMMIT;
