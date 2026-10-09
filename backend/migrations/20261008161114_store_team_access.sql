-- Manager memberships are service-managed; no direct REST access or writes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.store_memberships (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'manager' CHECK (role = 'manager'),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_memberships_active_store ON public.store_memberships(store_id) WHERE is_active;
ALTER TABLE public.store_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_memberships FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.store_memberships TO service_role;

CREATE OR REPLACE FUNCTION public.manage_store_member(p_store uuid, p_user uuid, p_admin uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner uuid; v_role text; v_existing public.store_memberships;
BEGIN
  SELECT owner_user_id INTO v_owner FROM public.stores WHERE id=p_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'STORE_NOT_FOUND'; END IF;
  IF p_user=v_owner THEN RAISE EXCEPTION 'PRIMARY_OWNER_IMMUTABLE'; END IF;
  -- Same lock as stores_one_per_owner: prevents a concurrent primary-store creation.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 110));
  SELECT role INTO v_role FROM public.users WHERE id=p_user FOR UPDATE;
  IF NOT FOUND OR v_role NOT IN ('customer','store_owner') THEN RAISE EXCEPTION 'INELIGIBLE_MEMBER'; END IF;
  IF EXISTS(SELECT 1 FROM public.stores WHERE owner_user_id=p_user) THEN RAISE EXCEPTION 'ALREADY_STORE_OWNER'; END IF;
  SELECT * INTO v_existing FROM public.store_memberships WHERE user_id=p_user FOR UPDATE;
  IF p_active THEN
    IF NOT EXISTS(SELECT 1 FROM public.store_memberships WHERE user_id=p_user AND store_id=p_store AND is_active) AND (SELECT count(*) FROM public.store_memberships WHERE store_id=p_store AND is_active)>=20 THEN RAISE EXCEPTION 'TEAM_LIMIT_REACHED'; END IF;
    IF v_existing.user_id IS NOT NULL AND v_existing.is_active AND v_existing.store_id<>p_store THEN RAISE EXCEPTION 'MEMBER_HAS_ANOTHER_STORE'; END IF;
    -- Admin approval is explicit. Never derive roles from user-editable JWT metadata.
    UPDATE public.users SET role='store_owner', is_approved=true, is_rejected=false WHERE id=p_user;
    INSERT INTO public.store_memberships(user_id,store_id,created_by) VALUES(p_user,p_store,p_admin)
      ON CONFLICT(user_id) DO UPDATE SET store_id=EXCLUDED.store_id,is_active=true,created_by=EXCLUDED.created_by,updated_at=now();
  ELSE
    UPDATE public.store_memberships SET is_active=false,updated_at=now() WHERE user_id=p_user AND store_id=p_store;
    IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.manage_store_member(uuid,uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_store_member(uuid,uuid,uuid,boolean) TO service_role;
-- Ownership and team membership are mutually exclusive even under concurrent admin actions.
CREATE OR REPLACE FUNCTION public.stores_one_per_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.owner_user_id::text, 110));
  IF EXISTS(SELECT 1 FROM public.store_memberships WHERE user_id=NEW.owner_user_id AND is_active) THEN
    RAISE EXCEPTION USING errcode='P0409', message='STORE_MANAGER_CANNOT_OWN';
  END IF;
  IF EXISTS(SELECT 1 FROM public.stores WHERE owner_user_id=NEW.owner_user_id AND id<>NEW.id) THEN
    RAISE EXCEPTION USING errcode='P0409', message='STORE_ALREADY_OWNED';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.stores_one_per_owner() FROM PUBLIC, anon, authenticated;
COMMIT;
