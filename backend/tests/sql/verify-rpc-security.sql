\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $$ DECLARE fn record; actor text; BEGIN
 FOR fn IN SELECT p.oid,p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f'
 AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') LOOP
  FOREACH actor IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_function_privilege(actor,fn.oid,'EXECUTE') THEN RAISE EXCEPTION 'Application RPC remains exposed to %: %',actor,fn.signature; END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role',fn.oid,'EXECUTE') THEN RAISE EXCEPTION 'Backend RPC unavailable: %',fn.signature;END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('create_order','create_trip_orders'))<>2 THEN RAISE EXCEPTION 'Legacy checkout overload remains';END IF;
END $$;
ROLLBACK;
SELECT 'Application RPC and checkout-overload permissions verified' AS result;
