BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Partner onboarding KYC photos (owner profile, Aadhaar, storefront) now
-- stored AES-256-GCM encrypted in the private store-documents bucket, same as
-- rider Aadhaar/DL. These columns hold the raw object PATH (not a public URL —
-- the bytes stream back through the /partner/documents/:assetId decrypt-proxy),
-- mirroring rider_onboarding_drafts.aadhaar_photo_url (042_rider_onboarding.sql).
-- Nullable: a draft without a given photo yet simply leaves it NULL.
ALTER TABLE public.store_onboarding_drafts
 ADD COLUMN IF NOT EXISTS profile_photo_path text,
 ADD COLUMN IF NOT EXISTS aadhaar_photo_path text,
 ADD COLUMN IF NOT EXISTS store_doc_path text;
-- The same three columns on stores so admin's approve step can copy the
-- paths off the draft onto the real store row (draft is deleted post-approval,
-- so the store row becomes the only place these live).
ALTER TABLE public.stores
 ADD COLUMN IF NOT EXISTS profile_photo_path text,
 ADD COLUMN IF NOT EXISTS aadhaar_photo_path text,
 ADD COLUMN IF NOT EXISTS store_doc_path text;
COMMIT;
