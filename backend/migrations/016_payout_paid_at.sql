-- Admin dashboard's Balance card (Overview page) needs a real "last
-- withdrawn on <date>" value — nothing in payouts recorded when a row
-- actually reached 'paid', only week_start/week_end (the settlement
-- period, not the payout event itself). jobs/weeklyPayouts.ts and
-- payments/webhook.ts both set this the instant a row transitions to
-- 'paid' (the no-real-money-movement zero-payout branch and RazorpayX's
-- own payout.processed webhook respectively).
alter table payouts
  add column if not exists paid_at timestamptz;
