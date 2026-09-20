-- Onboarding Step 2 now collects the shop owner's own typed "complete
-- address" (e.g. "Near Bus Stand, opposite Xyz store") separately from
-- the real reverse-geocoded map-pin address (address_line) — same
-- distinction stores.manual_address already draws post-approval
-- (Store Settings), just missing on the draft table until now.
alter table store_onboarding_drafts
  add column if not exists manual_address text;
