-- Additive v2 preserves the existing RPC contract during rolling deployment.
BEGIN;
CREATE OR REPLACE FUNCTION public.request_auth_context_v2(p_user_id uuid, p_session_id uuid)
RETURNS TABLE(user_id uuid, role text, is_approved boolean, session_valid boolean, phone text, session_expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
 SELECT account.id, profile.role::text, profile.is_approved,
   account.deleted_at IS NULL AND (account.banned_until IS NULL OR account.banned_until <= now())
   AND session.id IS NOT NULL AND (session.not_after IS NULL OR session.not_after > now()),
   account.phone::text, session.not_after
 FROM auth.users account
 LEFT JOIN public.users profile ON profile.id = account.id
 LEFT JOIN auth.sessions session ON session.id = p_session_id AND session.user_id = account.id
 WHERE account.id = p_user_id;
$$;
REVOKE ALL ON FUNCTION public.request_auth_context_v2(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_auth_context_v2(uuid, uuid) TO service_role;
COMMIT;
