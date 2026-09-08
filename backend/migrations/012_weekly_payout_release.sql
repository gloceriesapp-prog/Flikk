-- Weekly payout release (jobs/weeklyPayouts.ts) needs three things this
-- schema doesn't have yet:
--
-- 1. stores.razorpay_fund_account_id — POST /verify-payout already creates
--    a real RazorpayX Fund Account during verification (verifyPayoutAccount.ts)
--    but only cached the Contact id, not this. The actual money-movement
--    call (POST /v1/payouts) needs a fund_account_id directly — reusing
--    the one from verification instead of recreating it on every payout
--    run avoids piling up duplicate Fund Accounts on the same UPI/bank
--    destination.
--
-- 2. payouts.razorpay_payout_id — the real payout transaction id RazorpayX
--    returns, kept so the webhook handler (webhook.ts's own extended
--    payout.processed/reversed/failed handling) can find the right row
--    without relying on reference_id string-matching alone.
--
-- 3. A wider status set + a real uniqueness guarantee. The original
--    ('pending', 'paid') check was written before "no verified payout
--    destination" or "sent to Razorpay, awaiting confirmation" were real
--    states a row could be in — 'blocked' and 'processing' cover those.
--    'failed' covers a payout Razorpay accepted then reversed. The unique
--    constraint on (store_id, week_start) is the actual safety rail
--    against ever double-creating (and therefore double-paying) the same
--    store's same week if the weekly cron job's compute step ever runs
--    twice.
alter table stores
  add column if not exists razorpay_fund_account_id text;

alter table payouts
  add column if not exists razorpay_payout_id text;

alter table payouts drop constraint if exists payouts_status_check;
alter table payouts add constraint payouts_status_check
  check (status = any (array['pending', 'processing', 'paid', 'blocked', 'failed']));

alter table payouts add constraint payouts_store_week_unique unique (store_id, week_start);
