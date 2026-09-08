-- payout_upi_id: destination for the weekly RazorpayX Payouts batch
-- (payouts.week_start/week_end, rider_earnings — both already model a
-- weekly payout, no schema change needed there, just the beneficiary
-- address to send it to). A UPI VPA, not a bank account + IFSC — asking a
-- store owner or rider for a UPI ID is far lower friction than full bank
-- details, and RazorpayX Payouts can send directly to one.
--
-- Nullable on both: every store/rider that exists before this migration
-- has no payout destination on file yet and needs it collected via the
-- partner/rider app's own onboarding or profile screen (not built by this
-- migration) before their first automated payout can go out. Until then,
-- payouts for that store/rider stay on the existing manual path.
alter table stores
  add column payout_upi_id text;

alter table riders
  add column payout_upi_id text;
