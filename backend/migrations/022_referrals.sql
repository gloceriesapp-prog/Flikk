-- Referral/invite tracking — who invited whom, nothing more. Deliberately
-- NO credit/discount payout on either side: that would be a loyalty/
-- rewards mechanic, explicitly out of scope until MVP validates
-- (CLAUDE.md) — this table exists so a referral *program* can be turned
-- on later (join referred_signups to a future rewards ledger) without a
-- schema change, same "framework ready, mechanism not turned on yet"
-- pattern zones already uses for multi-zone.

create table referral_codes (
  id uuid primary key default gen_random_uuid(),
  -- One code per user, generated the first time GET /referrals/my-code is
  -- called (routes/referrals.ts) rather than at signup — most users never
  -- open the invite screen, no need to mint a code nobody asked for.
  user_id uuid not null references users(id) unique,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table referral_signups (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references referral_codes(id),
  -- The new account that signed up using this code. Unique — a given
  -- account can only ever have been referred once (whichever code it
  -- entered first at signup), same as any real invite program.
  referred_user_id uuid not null references users(id) unique,
  created_at timestamptz not null default now()
);

alter table referral_codes enable row level security;
alter table referral_signups enable row level security;
create policy referral_codes_self on referral_codes for select using (user_id = auth.uid());
