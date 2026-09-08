-- Real account-holder name pulled from Razorpay's own VPA validation API
-- (POST /v1/payments/validate/vpa) the moment a store owner verifies their
-- UPI ID in Settings — not a guess, not typed by the owner, the name
-- registered against that UPI ID at their bank/PSP. Kept alongside
-- payout_upi_id so the app can tell "this exact VPA was verified" apart
-- from "the owner typed something and never verified/edited it since" —
-- see partner.ts's POST /verify-upi and the partner app's own Settings
-- screen note on why editing the UPI ID after verifying clears this.
alter table stores
  add column if not exists payout_upi_verified_name text;
