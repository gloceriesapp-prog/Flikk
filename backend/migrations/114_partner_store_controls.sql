-- Partner account and store profile controls. Requires 001..110.
-- 1. Partner (store owner) account suspension. Distinct from the store
--    suspension in 110 (stores.admin_suspended): this one blocks the partner
--    account itself — every partner API route (requireActivePartner in the
--    backend) answers 403 PARTNER_SUSPENDED and the partner app shows a
--    blocking screen with the reason (GET /auth/me partner_suspended).
--    - users gains partner_suspended (+ _reason/_at/_by).
--    - partner_account_actions is the audit trail: one row per suspend or
--      reinstate, with the admin and reason. Service role only.
--    - admin_set_partner_suspension(user, suspend, reason, admin): suspend
--      requires a reason, sets the flag and closes every store the partner
--      owns; reinstate clears the flag and leaves the stores closed so the
--      partner reopens. Only store_owner accounts. Service role only.
--    - stores_partner_suspension_guard refuses is_active=true for a store
--      whose owner is suspended (P0409 PARTNER_SUSPENDED) on every write path.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- 1. Partner account suspension ---------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS partner_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_suspended_reason text,
  ADD COLUMN IF NOT EXISTS partner_suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_suspended_by uuid;

CREATE TABLE IF NOT EXISTS public.partner_account_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('suspend', 'reinstate')),
  reason text CHECK (reason IS NULL OR length(reason) <= 500),
  admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (action <> 'suspend' OR length(btrim(coalesce(reason, ''))) >= 3)
);
CREATE INDEX IF NOT EXISTS partner_account_actions_user_idx ON public.partner_account_actions(user_id, created_at DESC);
ALTER TABLE public.partner_account_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.partner_account_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.partner_account_actions TO service_role;

CREATE OR REPLACE FUNCTION public.stores_partner_suspension_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.is_active AND EXISTS(SELECT 1 FROM users WHERE id=NEW.owner_user_id AND partner_suspended) THEN
    RAISE EXCEPTION USING errcode='P0409', message='PARTNER_SUSPENDED';
  END IF;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.stores_partner_suspension_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS stores_partner_suspension_guard ON public.stores;
CREATE TRIGGER stores_partner_suspension_guard BEFORE INSERT OR UPDATE OF is_active, owner_user_id ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.stores_partner_suspension_guard();

CREATE OR REPLACE FUNCTION public.admin_set_partner_suspension(p_user uuid, p_suspend boolean, p_reason text, p_admin uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 500);
  v_role text;
  u public.users;
BEGIN
  IF p_suspend IS NULL THEN RAISE EXCEPTION USING errcode='P0400', message='suspend must be true or false'; END IF;
  IF p_suspend AND length(coalesce(v_reason, '')) < 3 THEN
    RAISE EXCEPTION USING errcode='P0400', message='A suspension reason is required';
  END IF;
  SELECT role INTO v_role FROM users WHERE id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Partner not found'; END IF;
  IF v_role <> 'store_owner' THEN
    RAISE EXCEPTION USING errcode='P0400', message='Only partner (store owner) accounts can be suspended here';
  END IF;
  IF p_suspend THEN
    UPDATE users SET partner_suspended=true, partner_suspended_reason=v_reason, partner_suspended_at=now(),
      partner_suspended_by=p_admin
    WHERE id=p_user RETURNING * INTO u;
    UPDATE stores SET is_active=false WHERE owner_user_id=p_user AND is_active;
  ELSE
    UPDATE users SET partner_suspended=false, partner_suspended_reason=NULL, partner_suspended_at=NULL,
      partner_suspended_by=NULL
    WHERE id=p_user RETURNING * INTO u;
  END IF;
  INSERT INTO partner_account_actions(user_id, action, reason, admin_id)
  VALUES (p_user, CASE WHEN p_suspend THEN 'suspend' ELSE 'reinstate' END, v_reason, p_admin);
  RETURN jsonb_build_object('user_id', u.id, 'partner_suspended', u.partner_suspended,
    'partner_suspended_reason', u.partner_suspended_reason, 'partner_suspended_at', u.partner_suspended_at);
END $function$;
REVOKE ALL ON FUNCTION public.admin_set_partner_suspension(uuid, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_partner_suspension(uuid, boolean, text, uuid) TO service_role;

COMMIT;
