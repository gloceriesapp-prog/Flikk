-- Home content controls. Requires 001..112.
-- home_sections gains 'quick-categories' and 'everyday-dairy' rows, so the
-- founder can hide and reorder them from admin's Home Sections screen like
-- every other All-tab section (the customer app used to force them in).
-- Positions reproduce today's layout: quick categories first, Everyday Dairy
-- immediately before Nearby Stores. Existing rows are never touched.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

INSERT INTO public.home_sections (key, title, sort_index)
SELECT 'quick-categories', null, coalesce(min(sort_index), 0) - 10 FROM public.home_sections
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.home_sections (key, title, sort_index)
SELECT 'everyday-dairy', null,
  coalesce((SELECT sort_index FROM public.home_sections WHERE key = 'nearby-stores'), 20) - 1
ON CONFLICT (key) DO NOTHING;

COMMIT;
