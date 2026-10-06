\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database() NOT IN('flikk_checkout_tests','flikk_migrations_tests') THEN RAISE EXCEPTION 'Use isolated security fixture';END IF;END $$;
-- Simulate inherited/default drift and an old checkout overload.
GRANT EXECUTE ON FUNCTION signal_store_inventory(uuid,uuid[],boolean),prune_inventory_signals() TO anon,authenticated;
CREATE FUNCTION public.create_order(uuid,uuid,uuid,numeric,numeric,numeric,numeric,jsonb) RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
GRANT EXECUTE ON FUNCTION public.create_order(uuid,uuid,uuid,numeric,numeric,numeric,numeric,jsonb) TO anon,authenticated;
\i backend/migrations/092_private_application_rpcs.sql
DO $$ DECLARE fn record;actor text; BEGIN
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('create_order','create_trip_orders'))<>2 THEN RAISE EXCEPTION 'Legacy overload survived'; END IF;
 FOR fn IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f' AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') LOOP
  FOREACH actor IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_function_privilege(actor,fn.oid,'EXECUTE') THEN RAISE EXCEPTION 'Application RPC exposed: % %',actor,fn.proname; END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role',fn.oid,'EXECUTE') THEN RAISE EXCEPTION 'Server RPC unavailable: %',fn.proname; END IF;
 END LOOP;
END $$;
CREATE FUNCTION public.test_future_private_rpc() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;
DO $$ BEGIN IF has_function_privilege('anon','test_future_private_rpc()','EXECUTE') OR has_function_privilege('authenticated','test_future_private_rpc()','EXECUTE') THEN RAISE EXCEPTION 'Future default execute leaked'; END IF;END $$;
DROP FUNCTION public.test_future_private_rpc();
