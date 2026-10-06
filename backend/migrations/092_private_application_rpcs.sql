-- Backend API is the only supported application RPC caller. Preserve extension
-- functions and Supabase-owned auth functions used by RLS.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ DECLARE fn record; canonical_order oid; canonical_trip oid; actor text; BEGIN
 canonical_order:=to_regprocedure('public.create_order(uuid,uuid,uuid,numeric,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric)');
 canonical_trip:=to_regprocedure('public.create_trip_orders(uuid,uuid,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric)');
 IF canonical_order IS NULL OR canonical_trip IS NULL THEN RAISE EXCEPTION 'Canonical checkout RPCs missing'; END IF;
 FOR fn IN SELECT p.oid,p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN('create_order','create_trip_orders')
 AND p.oid NOT IN(canonical_order,canonical_trip) LOOP
  EXECUTE format('DROP FUNCTION %s',fn.signature); -- No CASCADE: fail if still referenced.
 END LOOP;
 FOR fn IN SELECT p.oid,p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f'
 AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',fn.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',fn.signature);
  FOREACH actor IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_function_privilege(actor,fn.oid,'EXECUTE') THEN RAISE EXCEPTION 'Inherited RPC privilege remains: % %',actor,fn.signature; END IF;
  END LOOP;
 END LOOP;
END $$;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
COMMIT;
