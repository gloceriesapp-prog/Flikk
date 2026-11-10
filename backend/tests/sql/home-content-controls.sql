-- The default Home layout starts with Quick Categories and Local Favourites.
DO $$
DECLARE first_keys text[];
BEGIN
  SELECT array_agg(key ORDER BY sort_index, key) INTO first_keys
  FROM (SELECT key, sort_index FROM public.home_sections ORDER BY sort_index, key LIMIT 2) AS first_sections;
  IF first_keys IS DISTINCT FROM ARRAY['quick-categories', 'everyday-dairy'] THEN
    RAISE EXCEPTION 'Unexpected first two Home sections (%)', first_keys;
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
