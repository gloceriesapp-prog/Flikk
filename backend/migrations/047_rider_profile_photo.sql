-- Rider profile photo (optional) — a face photo the rider adds during
-- onboarding, shown as their avatar in the rider app's Profile screen.
-- Same private rider-documents bucket + object-PATH storage as the
-- Aadhaar/DL photos (042_rider_onboarding.sql) — served as a short-lived
-- signed URL on read, never public. Nullable: unlike Aadhaar/DL it's not a
-- verification requirement, just a nicer profile.
--
-- Lives on both the draft (collected during onboarding) and the real
-- `riders` row (copied over at admin approval, same as every other draft
-- field), so it survives the draft -> riders materialization.
alter table rider_onboarding_drafts add column if not exists photo_url text;
alter table riders add column if not exists photo_url text;
