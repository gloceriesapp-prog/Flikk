\set ON_ERROR_STOP on
-- Read-only deployment check. Safe to run against the migrated environment;
-- raises on permission drift without reading customer or merchant records.
BEGIN READ ONLY;
DO $$
DECLARE api_role text; table_name text; relation regclass; rpc record;
BEGIN
 FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
  FOREACH table_name IN ARRAY ARRAY['orders','order_items','trips','stores','products','product_variants'] LOOP
   relation := format('public.%I',table_name)::regclass;
   IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=relation) THEN
    RAISE EXCEPTION 'RLS disabled on %',relation;
   END IF;
   IF has_table_privilege(api_role,relation,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(api_role,relation,'INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION '% retains write permission on %',api_role,relation;
   END IF;
   IF (SELECT count(*) FROM pg_policy WHERE polrelid=relation AND NOT polpermissive
    AND polname IN('commerce_server_insert','commerce_server_update','commerce_server_delete')
    AND (SELECT oid FROM pg_roles WHERE rolname=api_role)=ANY(polroles)) <> 3 THEN
    RAISE EXCEPTION 'Missing restrictive write guards for % on %',api_role,relation;
   END IF;
  END LOOP;
  FOR rpc IN SELECT p.oid,p.oid::regprocedure AS signature FROM pg_proc p
   JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN
    ('create_order','create_trip_orders','request_auth_context','request_auth_context_v2') LOOP
   IF has_function_privilege(api_role,rpc.oid,'EXECUTE') THEN
    RAISE EXCEPTION '% can execute %',api_role,rpc.signature;
   END IF;
  END LOOP;
 END LOOP;
 FOREACH table_name IN ARRAY ARRAY['orders','order_items','trips','stores','products','product_variants'] LOOP
  relation := format('public.%I',table_name)::regclass;
  IF NOT has_table_privilege('service_role',relation,'SELECT')
   OR NOT has_table_privilege('service_role',relation,'INSERT')
   OR NOT has_table_privilege('service_role',relation,'UPDATE')
   OR NOT has_table_privilege('service_role',relation,'DELETE') THEN
   RAISE EXCEPTION 'Trusted server permissions missing on %',relation;
  END IF;
 END LOOP;
 IF NOT has_function_privilege('service_role','public.request_auth_context(uuid,uuid)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.request_auth_context_v2(uuid,uuid)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.create_order(uuid,uuid,uuid,numeric,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.create_trip_orders(uuid,uuid,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric)','EXECUTE') THEN
  RAISE EXCEPTION 'Trusted auth/checkout RPC permissions missing';
 END IF;
END $$;
ROLLBACK;
SELECT 'commerce security deployment checks passed' AS result;
