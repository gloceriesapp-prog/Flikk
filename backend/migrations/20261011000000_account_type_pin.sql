-- One phone number, one app. account_type pins a users row to the app it first
-- signed in through (customer / rider / store_owner) and is immutable after;
-- backend/src/routes/auth.ts enforces it at OTP request + verify, rejecting a
-- number that tries to sign in through a different app with a clear message.
--
-- Distinct from `role`: role stays 'customer' until an admin approval and
-- drives the approval + RLS machinery (unchanged here). account_type is the
-- permanent account IDENTITY the apps gate login on, so a pending rider (whose
-- role is still 'customer') can no longer also log into the customer or partner
-- app. LOGIN_TEST_OTPS numbers are exempt from the pin in code, so a tester can
-- reuse one number across apps; an admin can also change account_type.
--
-- Backfill pins every existing row by what it already is: an approved partner,
-- or the owner/applicant of a store -> store_owner; an approved rider, or a
-- rider row/applicant -> rider; everyone else (incl. admins, who never use the
-- app login pin) -> customer.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type text;

-- store_owner first, then rider, then the customer default. A row that matches
-- neither supply-side signal is a plain customer.
UPDATE users u SET account_type = 'store_owner'
 WHERE u.account_type IS NULL AND (
   u.role = 'store_owner'
   OR EXISTS (SELECT 1 FROM stores s WHERE s.owner_user_id = u.id)
   OR EXISTS (SELECT 1 FROM store_onboarding_drafts d WHERE d.user_id = u.id)
 );

UPDATE users u SET account_type = 'rider'
 WHERE u.account_type IS NULL AND (
   u.role = 'rider'
   OR EXISTS (SELECT 1 FROM riders r WHERE r.user_id = u.id)
   OR EXISTS (SELECT 1 FROM rider_onboarding_drafts d WHERE d.user_id = u.id)
 );

UPDATE users SET account_type = 'customer' WHERE account_type IS NULL;

ALTER TABLE users ALTER COLUMN account_type SET DEFAULT 'customer';
ALTER TABLE users ALTER COLUMN account_type SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_account_type_check
  CHECK (account_type IN ('customer', 'rider', 'store_owner'));

COMMIT;

NOTIFY pgrst, 'reload schema';
