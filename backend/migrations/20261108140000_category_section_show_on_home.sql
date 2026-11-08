-- Home's category section is picked by whole title (category_sections):
-- a title switched on shows its category tiles on Home, one switched off is
-- hidden there entirely. categories.show_on_home (20261108120000) still hides
-- a single tile inside a shown title. The Categories screen shows everything.
-- Defaults to true so today's Home is unchanged.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.category_sections ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT true;

COMMIT;
