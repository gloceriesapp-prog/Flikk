-- Migration 116: quick-categories and everyday-dairy are admin-controlled
-- home_sections rows, ordered first and immediately before nearby-stores.
DO $$
DECLARE quick integer; dairy integer; nearby integer; first_key text;
BEGIN
  SELECT sort_index INTO quick FROM public.home_sections WHERE key = 'quick-categories';
  SELECT sort_index INTO dairy FROM public.home_sections WHERE key = 'everyday-dairy';
  SELECT sort_index INTO nearby FROM public.home_sections WHERE key = 'nearby-stores';
  IF quick IS NULL THEN RAISE EXCEPTION 'quick-categories row missing'; END IF;
  IF dairy IS NULL THEN RAISE EXCEPTION 'everyday-dairy row missing'; END IF;
  SELECT key INTO first_key FROM public.home_sections ORDER BY sort_index, key LIMIT 1;
  IF first_key <> 'quick-categories' THEN RAISE EXCEPTION 'quick-categories is not first (%)', first_key; END IF;
  IF NOT (dairy < nearby AND NOT EXISTS (
    SELECT 1 FROM public.home_sections WHERE sort_index > dairy AND sort_index < nearby)) THEN
    RAISE EXCEPTION 'everyday-dairy is not immediately before nearby-stores (% / %)', dairy, nearby;
  END IF;
  IF NOT (SELECT enabled FROM public.home_sections WHERE key = 'quick-categories')
    OR NOT (SELECT enabled FROM public.home_sections WHERE key = 'everyday-dairy') THEN
    RAISE EXCEPTION 'new rows must default to enabled';
  END IF;
END $$;

-- Admin can hide and reorder them (the admin route upserts by key).
BEGIN;
UPDATE public.home_sections SET enabled = false, sort_index = 999 WHERE key IN ('quick-categories', 'everyday-dairy');
DO $$
BEGIN
  IF (SELECT count(*) FROM public.home_sections WHERE key IN ('quick-categories', 'everyday-dairy') AND NOT enabled AND sort_index = 999) <> 2 THEN
    RAISE EXCEPTION 'home section rows are not editable';
  END IF;
END $$;
ROLLBACK;

-- Re-running the seed is a no-op (admin edits survive a replay).
BEGIN;
UPDATE public.home_sections SET enabled = false WHERE key = 'everyday-dairy';
INSERT INTO public.home_sections (key, title, sort_index) VALUES ('everyday-dairy', null, 1) ON CONFLICT (key) DO NOTHING;
DO $$
BEGIN
  IF (SELECT enabled FROM public.home_sections WHERE key = 'everyday-dairy') THEN
    RAISE EXCEPTION 'seed replay overwrote an admin edit';
  END IF;
END $$;
ROLLBACK;
