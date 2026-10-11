-- Admin dashboard sign-in: a 6-digit code emailed to the founder
-- (apps/admin/src/lib/adminOtp.ts). This is now the SOLE login factor —
-- no Google/password step — keyed by the one admin user id. Only the HMAC
-- of the code is stored, never the code. One open challenge per admin user:
-- sending a new code replaces the old one. Attempts are capped per challenge
-- so a code can't be brute-forced; expiry is enforced by the admin API.
--
-- Service role only: RLS on, no policies — no client can read or write.

create table admin_otp_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null check (length(code_hash) = 64),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now()
);

alter table admin_otp_challenges enable row level security;
revoke all on admin_otp_challenges from anon, authenticated;

-- Atomically spends one attempt BEFORE the code is compared, returning the
-- stored hash only while attempts remain. Parallel guesses each consume
-- their own attempt, so the cap can't be raced.
create function claim_admin_otp_attempt(p_user uuid, p_max integer)
returns table (code_hash text, expires_at timestamptz)
language sql security definer set search_path = public, pg_temp as $$
  update admin_otp_challenges
     set attempts = attempts + 1
   where user_id = p_user and attempts < p_max
  returning admin_otp_challenges.code_hash, admin_otp_challenges.expires_at;
$$;

revoke all on function claim_admin_otp_attempt(uuid, integer) from public, anon, authenticated;
grant execute on function claim_admin_otp_attempt(uuid, integer) to service_role;
