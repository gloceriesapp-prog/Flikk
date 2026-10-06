\set ON_ERROR_STOP on
-- This setup emulates only the Auth tables needed by the fixture.
DO $$ BEGIN IF current_database() <> 'flikk_checkout_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY, phone text, deleted_at timestamptz, banned_until timestamptz);
CREATE TABLE IF NOT EXISTS auth.sessions(id uuid PRIMARY KEY, user_id uuid, not_after timestamptz);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;
\i backend/migrations/069_request_auth_context.sql
\i backend/migrations/070_tracking_live_revision.sql
\i backend/migrations/071_auth_session_expiry.sql
BEGIN;
INSERT INTO auth.users(id,phone) VALUES ('69000000-0000-0000-0000-000000000001','test');
INSERT INTO public.users(id,role) VALUES ('69000000-0000-0000-0000-000000000001','customer');
INSERT INTO auth.sessions(id,user_id) VALUES ('69000000-0000-0000-0000-000000000002','69000000-0000-0000-0000-000000000001');
INSERT INTO auth.users(id,phone) VALUES ('69000000-0000-0000-0000-000000000003','other');
INSERT INTO auth.sessions(id,user_id) VALUES ('69000000-0000-0000-0000-000000000004','69000000-0000-0000-0000-000000000003');
DO $$ DECLARE context record; item public.orders; previous bigint; BEGIN
 SELECT * INTO context FROM public.request_auth_context_v2('69000000-0000-0000-0000-000000000001','69000000-0000-0000-0000-000000000002');
 IF NOT context.session_valid OR context.role <> 'customer' THEN RAISE EXCEPTION 'Valid session rejected'; END IF;
 UPDATE public.users SET role='rider', is_approved=false WHERE id='69000000-0000-0000-0000-000000000001';
 SELECT * INTO context FROM public.request_auth_context_v2('69000000-0000-0000-0000-000000000001','69000000-0000-0000-0000-000000000002');
 IF context.role <> 'rider' OR context.is_approved THEN RAISE EXCEPTION 'Authoritative role/approval change missing'; END IF;
 UPDATE auth.users SET banned_until=now()+interval '1 hour' WHERE id='69000000-0000-0000-0000-000000000001';
 IF (SELECT session_valid FROM public.request_auth_context_v2('69000000-0000-0000-0000-000000000001','69000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'Banned user accepted'; END IF;
 UPDATE auth.users SET banned_until=NULL WHERE id='69000000-0000-0000-0000-000000000001';
 UPDATE auth.sessions SET not_after=now()+interval '1 minute' WHERE id='69000000-0000-0000-0000-000000000002';
 SELECT * INTO context FROM public.request_auth_context_v2('69000000-0000-0000-0000-000000000001','69000000-0000-0000-0000-000000000002');
 IF context.session_expires_at IS DISTINCT FROM now()+interval '1 minute' THEN RAISE EXCEPTION 'Known session expiry missing'; END IF;
 UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id='69000000-0000-0000-0000-000000000002';
 IF (SELECT session_valid FROM public.request_auth_context_v2('69000000-0000-0000-0000-000000000001','69000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'Expired session accepted'; END IF;
 DELETE FROM auth.sessions WHERE id='69000000-0000-0000-0000-000000000002';
 IF (SELECT session_valid FROM public.request_auth_context_v2('69000000-0000-0000-0000-000000000001','69000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'Revoked session accepted'; END IF;
 IF (SELECT session_valid FROM public.request_auth_context_v2('69000000-0000-0000-0000-000000000001','69000000-0000-0000-0000-000000000004')) THEN RAISE EXCEPTION 'Foreign session accepted'; END IF;
 INSERT INTO auth.sessions(id,user_id) VALUES ('69000000-0000-0000-0000-000000000002','69000000-0000-0000-0000-000000000001');
 UPDATE auth.users SET deleted_at=now() WHERE id='69000000-0000-0000-0000-000000000001';
 IF (SELECT session_valid FROM public.request_auth_context_v2('69000000-0000-0000-0000-000000000001','69000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'Deleted account accepted'; END IF;
 IF has_function_privilege('authenticated','public.request_auth_context_v2(uuid,uuid)','EXECUTE') OR has_function_privilege('anon','public.request_auth_context_v2(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Private auth lookup exposed'; END IF;
 item := public.test_order(1); previous := item.live_revision;
 UPDATE public.orders SET status=status WHERE id=item.id;
 IF (SELECT live_revision FROM public.orders WHERE id=item.id) <> previous+1 THEN RAISE EXCEPTION 'Tracking revision did not increase'; END IF;
END $$;
ROLLBACK;
