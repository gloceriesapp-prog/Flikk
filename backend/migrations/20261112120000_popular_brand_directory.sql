BEGIN;
SET LOCAL lock_timeout = '5s';

-- Ten is a customer preview limit, not a limit on the curated directory.
ALTER TABLE public.brands DROP CONSTRAINT brands_popular_position_range;
ALTER TABLE public.brands ADD CONSTRAINT brands_popular_position_range
  CHECK (popular_position BETWEEN 1 AND 1000);

COMMIT;
