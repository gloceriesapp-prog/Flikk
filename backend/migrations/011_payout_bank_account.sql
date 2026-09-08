-- Bank account + IFSC as a second payout method alongside UPI, per an
-- explicit ask — same real RazorpayX Fund Account Validation flow
-- (verifyPayoutAccount.ts), just account_type: "bank_account" instead of
-- "vpa". payout_method tracks which one is actually active; the unused
-- one's columns stay null rather than clearing payout_upi_id the moment
-- someone tries bank account (switching back doesn't lose the old
-- verified UPI details for free).
--
-- payout_bank_account_number stores the REAL account number (needed to
-- actually send the weekly payout later) — GET /partner/store must never
-- return this unmasked to the client; routes/partner.ts masks it to
-- last-4 before sending, same convention Razorpay's own API response
-- already uses for account numbers.
alter table stores
  add column if not exists payout_method text check (payout_method in ('upi', 'bank_account')),
  add column if not exists payout_bank_account_number text,
  add column if not exists payout_bank_ifsc text;
