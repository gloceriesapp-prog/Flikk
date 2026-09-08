-- Backs the real RazorpayX Fund Account Validation flow (partner.ts's own
-- POST /verify-upi) — a UPI ID resolves to a real underlying bank account,
-- and Razorpay's validation_results.bank_account carries the bank name
-- alongside the account-holder name (registered_name) already covered by
-- payout_upi_verified_name (migration 009). razorpay_contact_id caches
-- the RazorpayX Contact created for this store's payout identity so a
-- re-verify (or verifying a second UPI ID later) doesn't create a
-- duplicate Contact on Razorpay's side every time.
alter table stores
  add column if not exists payout_bank_name text,
  add column if not exists razorpay_contact_id text;
