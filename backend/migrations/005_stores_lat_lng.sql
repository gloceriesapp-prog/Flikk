-- Real stores never got the lat/lng columns store_onboarding_drafts already
-- has — the partner app's own onboarding (LocationPinScreen.tsx) captures a
-- store's exact pin position and PATCHes it onto the draft (store_onboarding_
-- drafts.lat/lng), but admin's approve step (apps/admin/src/app/api/
-- approvals/stores/[userId]/route.ts) only ever copied store_name/category/
-- district/gst_number/photo_url into the real row, silently dropping the
-- coordinates the owner already pinned. A store's own physical location is a
-- one-time geocode of a fixed address, same category as addresses.latitude/
-- longitude already used for customer delivery addresses — not the "live GPS
-- delivery tracking" CLAUDE.md's scope-discipline section bans (that's about
-- a moving rider dot, not a static shopfront).
--
-- Nullable: every store approved before this migration has no pin on file
-- and needs one backfilled by hand (or re-onboarded) — a real store still
-- has to work (still shows in the list, still takes orders) without a
-- coordinate, it just can't be sorted by distance until it has one.
alter table stores
  add column lat double precision,
  add column lng double precision;
