-- Two new managed Category-tab-content tabs — Festivals + Meat — added the
-- same way as Grocery/Fresh/Regional (TAB_KEYS in packages/home-content).
-- home_content.tab_key is CHECK-constrained to the known keys, so the keys
-- must be allowed here before the admin/app can read or write their rows.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.home_content DROP CONSTRAINT home_content_tab_key_check;
ALTER TABLE public.home_content ADD CONSTRAINT home_content_tab_key_check
  CHECK (tab_key IN ('grocery', 'fresh', 'regional', 'festivals', 'meat'));

-- Seed one row per new tab (empty section list — valid per the content CHECK;
-- the founder fills sections in Category-tab content, e.g. a Festival shelf on
-- Festivals). enabled=true so both tabs show in the app immediately. The
-- customer requires exactly one home_content row per TAB_KEY, so these rows
-- must exist in lockstep with the TAB_KEYS change shipped in the app bundle.
INSERT INTO public.home_content(tab_key, content) VALUES
  ('festivals', '{"schemaVersion":1,"tabTitle":"Festivals","enabled":true,"sections":[]}'::jsonb),
  ('meat', '{"schemaVersion":1,"tabTitle":"Meat","enabled":true,"sections":[]}'::jsonb)
ON CONFLICT (tab_key) DO NOTHING;

COMMIT;
