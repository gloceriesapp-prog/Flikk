-- Home welcome banner on/off (2026-11-27): a home_sections row the customer
-- app reads only for its enabled flag (no row = shown). Starts switched off,
-- per the founder's request to hide it; turn it back on in admin Home
-- Sections. Parked at the end of the list: the banner's place on Home is
-- fixed (below Namma Brands), so its sort_index doesn't move it.
BEGIN;
SET LOCAL lock_timeout='5s';
INSERT INTO public.home_sections (key, title, enabled, sort_index)
SELECT 'welcome-banner', 'Welcome banner', false, coalesce(max(sort_index), 0) + 10 FROM public.home_sections
ON CONFLICT (key) DO NOTHING;
COMMIT;
