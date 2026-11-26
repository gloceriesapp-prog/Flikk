-- Namma Brands (20261127100000) was seeded at sort_index 5, which put its
-- row second in the Home Sections list. The block is always drawn above the
-- welcome card whatever its sort_index, so park the row at the end of the
-- list where it doesn't shift the real section order.
BEGIN;
SET LOCAL lock_timeout='5s';
UPDATE public.home_sections
SET sort_index = (SELECT coalesce(max(sort_index), 0) + 10 FROM public.home_sections WHERE key <> 'namma-brands')
WHERE key = 'namma-brands';
COMMIT;
