-- Admin account controls. Requires 001..107.
-- 1. Rider suspension. riders.is_active is the account bit every dispatch
--    path already reads (rider_dispatch_offers / accept_dispatch_offer, 107).
--    - riders gains suspended_reason / suspended_at / suspended_by.
--    - admin_set_rider_suspension(rider, suspend, reason, admin): suspend sets
--      is_active=false and forces status 'offline'; reactivate sets
--      is_active=true and clears the reason. Service role only.
--    - riders_suspension_guard: an inactive rider can never be 'online', so no
--      write path (API, app, dashboard) can put a suspended rider back on shift.
--    - nearby_online_riders (latest: 057) also requires is_active, so a
--      suspended rider gets no new-pickup pushes. Body otherwise unchanged.
-- 2. Customer blocks. The ban itself is Supabase Auth's banned_until (set by
--    the admin panel with auth.admin.updateUserById ban_duration), which
--    request_auth_context_v2 (071) already treats as an invalid session.
--    - customer_blocks records who blocked whom, why, until when, and when
--      the block was lifted. Service role only (RLS on, no policies).
--    - auth_account_blocked(user) lets the API tell a ban apart from a dead
--      session so apps can show "account blocked" instead of a silent logout.
-- 3. Store suspension. is_active stays the partner's open/closed switch;
--    stores gains admin_suspended (+ suspended_reason/_at/_by), which only
--    admin_set_store_suspension (service role) changes. Suspend sets
--    admin_suspended=true AND is_active=false; unsuspend clears
--    admin_suspended and leaves is_active=false so the partner reopens.
--    stores_suspension_guard refuses is_active=true while admin_suspended on
--    every write path (P0409 STORE_SUSPENDED).
-- 4. admin_set_store_payout_account(store, method, ...): the admin panel's way
--    to set or replace a store's real payout destination (the payout_*
--    columns payouts read, not the legacy bank_name/bank_account_last4), e.g.
--    for an admin-created store whose owner never opens the partner app.
--    Same formats and column shape as PUT /partner/payout-account
--    (backend/src/lib/payoutAccount.ts) and the same verification reset, so
--    the founder must still verify the name before paying.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- 1. Rider suspension -------------------------------------------------------
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

CREATE OR REPLACE FUNCTION public.riders_suspension_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NOT NEW.is_active AND NEW.status = 'online' THEN
    RAISE EXCEPTION USING errcode='P0403', message='RIDER_SUSPENDED';
  END IF;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.riders_suspension_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS riders_suspension_guard ON public.riders;
CREATE TRIGGER riders_suspension_guard BEFORE INSERT OR UPDATE OF status, is_active ON public.riders
  FOR EACH ROW EXECUTE FUNCTION public.riders_suspension_guard();

CREATE OR REPLACE FUNCTION public.admin_set_rider_suspension(p_rider uuid, p_suspend boolean, p_reason text, p_admin uuid)
 RETURNS public.riders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE r public.riders;
BEGIN
  IF p_suspend AND nullif(btrim(coalesce(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION USING errcode='P0400', message='A suspension reason is required';
  END IF;
  IF p_suspend THEN
    UPDATE riders SET is_active=false, status='offline', suspended_reason=left(btrim(p_reason), 500),
      suspended_at=now(), suspended_by=p_admin
    WHERE id=p_rider RETURNING * INTO r;
  ELSE
    UPDATE riders SET is_active=true, suspended_reason=NULL, suspended_at=NULL, suspended_by=NULL
    WHERE id=p_rider RETURNING * INTO r;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Rider not found'; END IF;
  RETURN r;
END $function$;
REVOKE ALL ON FUNCTION public.admin_set_rider_suspension(uuid, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_rider_suspension(uuid, boolean, text, uuid) TO service_role;

create or replace function nearby_online_riders(p_store_lat double precision, p_store_lng double precision, p_radius_m double precision)
returns table(rider_user_id uuid, distance_m double precision)
language sql
stable
as $$
  with distances as (
    select
      r.user_id,
      6371000 * acos(least(1, greatest(-1,
        cos(radians(p_store_lat)) * cos(radians(r.current_lat)) * cos(radians(r.current_lng) - radians(p_store_lng))
        + sin(radians(p_store_lat)) * sin(radians(r.current_lat))
      ))) as distance_m
    from riders r
    where r.status = 'online'
      and r.is_active
      and r.current_lat is not null
      and r.current_lng is not null
      and r.last_location_update is not null
      and r.last_location_update > now() - interval '3 minutes'
  )
  select user_id as rider_user_id, distance_m
  from distances
  where distance_m <= p_radius_m
  order by distance_m asc;
$$;

-- 2. Customer blocks ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 500),
  blocked_by uuid,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  unblocked_at timestamptz,
  unblocked_by uuid,
  CHECK (blocked_until IS NULL OR blocked_until > blocked_at),
  CHECK (unblocked_at IS NULL OR unblocked_at >= blocked_at)
);
CREATE INDEX IF NOT EXISTS customer_blocks_user_idx ON public.customer_blocks(user_id, blocked_at DESC);
ALTER TABLE public.customer_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_blocks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_blocks TO service_role;

CREATE OR REPLACE FUNCTION public.auth_account_blocked(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, auth, pg_temp
AS $function$
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id AND banned_until > now());
$function$;
REVOKE ALL ON FUNCTION public.auth_account_blocked(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_account_blocked(uuid) TO service_role;

-- 3. Store suspension --------------------------------------------------------
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS admin_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

CREATE OR REPLACE FUNCTION public.stores_suspension_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.admin_suspended AND NEW.is_active THEN
    RAISE EXCEPTION USING errcode='P0409', message='STORE_SUSPENDED';
  END IF;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.stores_suspension_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS stores_suspension_guard ON public.stores;
CREATE TRIGGER stores_suspension_guard BEFORE INSERT OR UPDATE OF is_active, admin_suspended ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.stores_suspension_guard();

CREATE OR REPLACE FUNCTION public.admin_set_store_suspension(p_store uuid, p_suspend boolean, p_reason text, p_admin uuid)
 RETURNS public.stores
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE s public.stores;
BEGIN
  IF p_suspend AND nullif(btrim(coalesce(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION USING errcode='P0400', message='A suspension reason is required';
  END IF;
  IF p_suspend THEN
    UPDATE stores SET admin_suspended=true, is_active=false, suspended_reason=left(btrim(p_reason), 500),
      suspended_at=now(), suspended_by=p_admin
    WHERE id=p_store RETURNING * INTO s;
  ELSE
    UPDATE stores SET admin_suspended=false, suspended_reason=NULL, suspended_at=NULL, suspended_by=NULL
    WHERE id=p_store RETURNING * INTO s;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Store not found'; END IF;
  RETURN s;
END $function$;
REVOKE ALL ON FUNCTION public.admin_set_store_suspension(uuid, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_store_suspension(uuid, boolean, text, uuid) TO service_role;

-- 4. Admin payout destination ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_store_payout_account(p_store uuid, p_method text, p_upi_id text,
  p_account_holder_name text, p_account_number text, p_ifsc text, p_bank_name text, p_admin uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_upi text := btrim(coalesce(p_upi_id, ''));
  v_holder text := btrim(coalesce(p_account_holder_name, ''));
  v_account text := btrim(coalesce(p_account_number, ''));
  v_ifsc text := upper(btrim(coalesce(p_ifsc, '')));
  v_bank text := nullif(btrim(coalesce(p_bank_name, '')), '');
  s public.stores;
BEGIN
  IF p_admin IS NULL THEN RAISE EXCEPTION USING errcode='P0400', message='Admin id required'; END IF;
  IF p_method = 'upi' THEN
    -- Same as the API's UPI pattern; PG caps {m,n} at 255, so the 256 limit is a length check.
    IF v_upi !~ '^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,64}$' OR length(split_part(v_upi, '@', 1)) > 256 THEN
      RAISE EXCEPTION USING errcode='P0400', message='Enter a valid UPI ID, e.g. name@okaxis.'; END IF;
    UPDATE stores SET payout_method='upi', payout_upi_id=v_upi, payout_account_holder_name=NULL,
      payout_bank_account_number=NULL, payout_bank_ifsc=NULL, payout_bank_name=NULL, payout_proof_path=NULL,
      payout_details_status='unverified', payout_details_verified_at=NULL, payout_details_verified_by=NULL, payout_upi_verified_name=NULL
    WHERE id=p_store RETURNING * INTO s;
  ELSIF p_method = 'bank' THEN
    IF length(v_holder) NOT BETWEEN 2 AND 100 THEN
      RAISE EXCEPTION USING errcode='P0400', message='Account holder name must be 2-100 characters.'; END IF;
    IF v_account !~ '^\d{9,18}$' THEN RAISE EXCEPTION USING errcode='P0400', message='Account number must be 9-18 digits.'; END IF;
    IF v_ifsc !~ '^[A-Z]{4}0[A-Z0-9]{6}$' THEN
      RAISE EXCEPTION USING errcode='P0400', message='Enter a valid 11-character IFSC, e.g. HDFC0001234.'; END IF;
    IF length(coalesce(v_bank, '')) > 100 THEN RAISE EXCEPTION USING errcode='P0400', message='Bank name must be at most 100 characters.'; END IF;
    UPDATE stores SET payout_method='bank', payout_upi_id=NULL, payout_account_holder_name=v_holder,
      payout_bank_account_number=v_account, payout_bank_ifsc=v_ifsc, payout_bank_name=v_bank, payout_proof_path=NULL,
      payout_details_status='unverified', payout_details_verified_at=NULL, payout_details_verified_by=NULL, payout_upi_verified_name=NULL
    WHERE id=p_store RETURNING * INTO s;
  ELSE
    RAISE EXCEPTION USING errcode='P0400', message='method must be upi or bank';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Store not found'; END IF;
  RETURN jsonb_build_object('method', s.payout_method, 'upi_id', s.payout_upi_id,
    'account_holder_name', s.payout_account_holder_name, 'account_last4', right(s.payout_bank_account_number, 4),
    'ifsc', s.payout_bank_ifsc, 'bank_name', s.payout_bank_name, 'status', s.payout_details_status);
END $function$;
REVOKE ALL ON FUNCTION public.admin_set_store_payout_account(uuid, text, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_store_payout_account(uuid, text, text, text, text, text, text, uuid) TO service_role;

COMMIT;
