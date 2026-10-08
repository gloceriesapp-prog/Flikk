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
-- 2. Store categories (backend lib/storeCategories.ts, the same set admin
--    allows): a pharmacy needs a drug licence, so the onboarding draft now
--    carries store_onboarding_drafts.drug_license_number, which admin
--    approval copies to stores.drug_license_number (091).
-- 3. Store profile change review. A partner edit to the store's identity or
--    reach (name, category, district, address_line, manual_address, lat/lng,
--    drug_license_number) no longer goes live: PATCH /partner/store files it
--    as a store_profile_change_requests row and the live store stays
--    unchanged until admin approves it (Stores page). Harmless fields
--    (hours, prep time, photo, documents, open/closed) stay live.
--    - One pending request per store; a newer edit merges into it (the old
--      row is marked superseded) and fields equal to the live value drop out.
--    - partner_request_store_profile_change(store, user, changes) files it.
--    - admin_review_store_profile_change(request, approve, reason, admin)
--      applies it to stores (approve) or records the reason (reject). A
--      pharmacy cannot end up without a drug licence. Service role only.
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

-- 2. Drug licence on the onboarding draft ---------------------------------------
ALTER TABLE public.store_onboarding_drafts ADD COLUMN IF NOT EXISTS drug_license_number text;

-- 3. Store profile change review ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  requested_by uuid,
  changes jsonb NOT NULL CHECK (jsonb_typeof(changes) = 'object' AND changes <> '{}'::jsonb),
  previous jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  review_reason text CHECK (review_reason IS NULL OR length(review_reason) <= 500),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'rejected' OR length(btrim(coalesce(review_reason, ''))) >= 3)
);
CREATE UNIQUE INDEX IF NOT EXISTS store_profile_change_one_pending ON public.store_profile_change_requests(store_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS store_profile_change_store_idx ON public.store_profile_change_requests(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS store_profile_change_pending_idx ON public.store_profile_change_requests(created_at) WHERE status = 'pending';
ALTER TABLE public.store_profile_change_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.store_profile_change_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.store_profile_change_requests TO service_role;

CREATE OR REPLACE FUNCTION public.partner_request_store_profile_change(p_store uuid, p_user uuid, p_changes jsonb)
 RETURNS public.store_profile_change_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  s public.stores;
  live jsonb;
  old public.store_profile_change_requests;
  merged jsonb;
  prev jsonb := '{}'::jsonb;
  k text;
  r public.store_profile_change_requests;
BEGIN
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION USING errcode='P0400', message='changes must be an object';
  END IF;
  FOR k IN SELECT jsonb_object_keys(p_changes) LOOP
    IF k <> ALL(ARRAY['name','category','district','address_line','manual_address','lat','lng','drug_license_number']) THEN
      RAISE EXCEPTION USING errcode='P0400', message=format('%s is not a reviewed store field', k);
    END IF;
  END LOOP;
  SELECT * INTO s FROM stores WHERE id=p_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Store not found'; END IF;
  IF p_user IS NOT NULL AND s.owner_user_id <> p_user THEN
    RAISE EXCEPTION USING errcode='P0403', message='Not this store''s owner';
  END IF;
  live := jsonb_build_object('name', s.name, 'category', s.category, 'district', s.district,
    'address_line', s.address_line, 'manual_address', s.manual_address, 'lat', s.lat, 'lng', s.lng,
    'drug_license_number', s.drug_license_number);
  SELECT * INTO old FROM store_profile_change_requests WHERE store_id=p_store AND status='pending' FOR UPDATE;
  merged := coalesce(old.changes, '{}'::jsonb) || p_changes;
  -- A field set back to its live value is no longer a change (blank text
  -- and NULL count as the same value).
  FOR k IN SELECT jsonb_object_keys(merged) LOOP
    IF (k IN ('lat', 'lng') AND merged->k IS NOT DISTINCT FROM live->k)
       OR (k NOT IN ('lat', 'lng') AND coalesce(merged->>k, '') = coalesce(live->>k, '')) THEN
      merged := merged - k;
    ELSE
      prev := prev || jsonb_build_object(k, live->k);
    END IF;
  END LOOP;
  IF old.id IS NOT NULL THEN
    UPDATE store_profile_change_requests SET status='superseded' WHERE id=old.id;
  END IF;
  IF merged = '{}'::jsonb THEN RETURN NULL; END IF;
  INSERT INTO store_profile_change_requests(store_id, requested_by, changes, previous)
  VALUES (p_store, p_user, merged, prev) RETURNING * INTO r;
  RETURN r;
END $function$;
REVOKE ALL ON FUNCTION public.partner_request_store_profile_change(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_request_store_profile_change(uuid, uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_review_store_profile_change(p_request uuid, p_approve boolean, p_reason text, p_admin uuid)
 RETURNS public.store_profile_change_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  r public.store_profile_change_requests;
  c jsonb;
  s public.stores;
  v_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 500);
BEGIN
  IF p_approve IS NULL THEN RAISE EXCEPTION USING errcode='P0400', message='approve must be true or false'; END IF;
  SELECT * INTO r FROM store_profile_change_requests WHERE id=p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Change request not found'; END IF;
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION USING errcode='P0409', message='This change request was already handled or replaced by a newer one';
  END IF;
  IF NOT p_approve THEN
    IF length(coalesce(v_reason, '')) < 3 THEN
      RAISE EXCEPTION USING errcode='P0400', message='A rejection reason is required';
    END IF;
    UPDATE store_profile_change_requests SET status='rejected', review_reason=v_reason, reviewed_by=p_admin, reviewed_at=now()
    WHERE id=p_request RETURNING * INTO r;
    RETURN r;
  END IF;
  c := r.changes;
  UPDATE stores SET
    name = CASE WHEN c ? 'name' THEN c->>'name' ELSE name END,
    category = CASE WHEN c ? 'category' THEN c->>'category' ELSE category END,
    district = CASE WHEN c ? 'district' THEN c->>'district' ELSE district END,
    address_line = CASE WHEN c ? 'address_line' THEN c->>'address_line' ELSE address_line END,
    manual_address = CASE WHEN c ? 'manual_address' THEN c->>'manual_address' ELSE manual_address END,
    lat = CASE WHEN c ? 'lat' THEN (c->>'lat')::double precision ELSE lat END,
    lng = CASE WHEN c ? 'lng' THEN (c->>'lng')::double precision ELSE lng END,
    drug_license_number = CASE WHEN c ? 'drug_license_number' THEN c->>'drug_license_number' ELSE drug_license_number END
  WHERE id=r.store_id RETURNING * INTO s;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Store not found'; END IF;
  IF s.category = 'Pharmacy' AND nullif(btrim(coalesce(s.drug_license_number, '')), '') IS NULL THEN
    RAISE EXCEPTION USING errcode='P0400', message='A pharmacy needs a drug licence number';
  END IF;
  UPDATE store_profile_change_requests SET status='approved', review_reason=v_reason, reviewed_by=p_admin, reviewed_at=now()
  WHERE id=p_request RETURNING * INTO r;
  RETURN r;
END $function$;
REVOKE ALL ON FUNCTION public.admin_review_store_profile_change(uuid, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_store_profile_change(uuid, boolean, text, uuid) TO service_role;

COMMIT;
