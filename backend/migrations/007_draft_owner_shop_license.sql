-- Owner name + Shop & Establishment license number — collected during
-- onboarding (Step 1 for owner name, alongside GST in Step 2 for the shop
-- license) and carried on the draft until approval copies them onto the
-- real `stores` row.
--
-- Both columns already exist on `stores` itself (added outside the
-- tracked migration history at some point, alongside pan_number,
-- aadhaar_last4, fssai_number, etc. — none of those are wired to any
-- screen and are left untouched here), but store_onboarding_drafts never
-- got them, so a submitted application had nowhere to hold these two
-- values until admin's approve step. `if not exists` since this
-- environment's `stores` table already has its own copies from that
-- earlier, undocumented change — this migration only concerns the draft
-- table.
--
-- shop_establishment_number is optional, same as gst_number — most
-- kirana-scale stores either don't have one yet or the owner doesn't have
-- it on hand at signup time; not worth blocking onboarding over.
alter table store_onboarding_drafts
  add column if not exists owner_name text,
  add column if not exists shop_establishment_number text;
