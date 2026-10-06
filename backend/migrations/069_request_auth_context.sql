-- Service-only role + session validity lookup, one bounded read instead of
-- independent Auth and profile calls on each tracking poll.
BEGIN;
CREATE OR REPLACE FUNCTION public.request_auth_context(p_user_id uuid, p_session_id uuid)
RETURNS TABLE(user_id uuid, role text, is_approved boolean, session_valid boolean, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
 SELECT account.id, profile.role::text, profile.is_approved,
   account.deleted_at IS NULL AND (account.banned_until IS NULL OR account.banned_until <= now())
   AND EXISTS(SELECT 1 FROM auth.sessions session WHERE session.id = p_session_id
       AND session.user_id = account.id AND (session.not_after IS NULL OR session.not_after > now())),
   account.phone::text
 FROM auth.users account LEFT JOIN public.users profile ON profile.id = account.id
 WHERE account.id = p_user_id;
$$;
REVOKE ALL ON FUNCTION public.request_auth_context(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_auth_context(uuid, uuid) TO service_role;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='users') THEN
 ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
 END IF;
END $$;
COMMIT;
