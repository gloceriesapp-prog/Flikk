-- Riders can now choose UPI as their payout destination, not just a bank
-- account. 042_rider_onboarding.sql only allowed payout_method 'bank_account'
-- and added no UPI columns; this mirrors what stores already have
-- (006_payout_upi.sql / 009_payout_upi_verified_name.sql) so the shared
-- verifyPayoutAccount flow (RazorpayX Fund Account Validation) persists a
-- rider's UPI VPA the same way it does a store's.
--
-- Idempotent: safe to re-run.
alter table riders drop constraint if exists riders_payout_method_check;
alter table riders add column if not exists payout_upi_id text;
alter table riders add column if not exists payout_upi_verified_name text;
alter table riders add constraint riders_payout_method_check check (payout_method in ('bank_account', 'upi'));
