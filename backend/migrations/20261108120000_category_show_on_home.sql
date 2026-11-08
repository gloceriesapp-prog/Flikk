-- Which categories the Home screen's category section shows. The Categories
-- screen keeps showing every active category; Home shows only these. Set per
-- category from the admin Categories page. Defaults to true so today's Home
-- is unchanged until a category is switched off there.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT true;

COMMIT;
