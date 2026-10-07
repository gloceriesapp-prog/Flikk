-- Recover legacy columns that live code depends on but no earlier migration creates.
-- Production already has them (added out of band); the types below match production
-- information_schema exactly, so this is a no-op there and only fills the gap on a
-- database built purely from this migration chain. 091 is checksum-pinned, hence a new file.
--   users.is_rejected      boolean NOT NULL DEFAULT false
--   users.expo_push_token  text NULL
--   addresses.latitude     numeric NULL
--   addresses.longitude    numeric NULL
BEGIN;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_rejected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expo_push_token text;
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;
COMMIT;
