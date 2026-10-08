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

COMMIT;
