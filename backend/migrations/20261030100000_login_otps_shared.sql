-- Pending login codes move out of the API process into Postgres, so more than
-- one API replica can run: a code sent by one replica is checked by another,
-- and a deploy/restart no longer wipes codes customers are typing in.
--
-- Only the backend (service role) touches this table: RLS is on with no
-- policies, and anon/authenticated have no grants. code_hash is an HMAC of
-- phone+code under a server-side pepper (auth/loginOtp.ts), never the code.

create table if not exists public.login_otps (
  phone      text primary key,
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   smallint not null default 0
);
create index if not exists login_otps_expires_at_idx on public.login_otps (expires_at);

alter table public.login_otps enable row level security;
revoke all on public.login_otps from public, anon, authenticated;
grant select, insert, update, delete on public.login_otps to service_role;

-- One atomic check per try, so two replicas can't both count the same wrong
-- attempt as the first one. Right code: true, row kept (consumed only after
-- the session exists). Wrong code: attempts + 1, row deleted at the limit.
-- Expired or missing: false (expired rows are removed).
create or replace function public.check_login_otp(
  p_phone text, p_code_hash text, p_now timestamptz, p_max_attempts int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.login_otps;
begin
  select * into r from public.login_otps where phone = p_phone for update;
  if not found then
    return false;
  end if;
  if r.expires_at <= p_now then
    delete from public.login_otps where phone = p_phone;
    return false;
  end if;
  if r.code_hash = p_code_hash then
    return true;
  end if;
  if r.attempts + 1 >= p_max_attempts then
    delete from public.login_otps where phone = p_phone;
  else
    update public.login_otps set attempts = r.attempts + 1 where phone = p_phone;
  end if;
  return false;
end;
$$;

revoke execute on function public.check_login_otp(text, text, timestamptz, int) from public, anon, authenticated;
grant execute on function public.check_login_otp(text, text, timestamptz, int) to service_role;
