-- Commerce mutations must pass through the authenticated backend/admin.
-- RLS ownership is a read boundary, not permission to forge orders or approve
-- shops/products. Preserve SELECT grants/policies and existing data.
BEGIN;
-- Bound deployment lock waits; retry during quieter traffic if needed.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $hardening$
DECLARE
  table_name text;
  relation regclass;
  attribute record;
  old_policy record;
  policy_roles text;
  rpc record;
  api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['orders', 'order_items', 'trips', 'stores', 'products', 'product_variants'] LOOP
    relation := format('public.%I', table_name)::regclass;
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', relation);
    -- TRUNCATE bypasses RLS; column grants survive table-level REVOKE.
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE %s FROM PUBLIC, anon, authenticated', relation);
    FOR attribute IN SELECT attname FROM pg_attribute
      WHERE attrelid = relation AND attnum > 0 AND NOT attisdropped LOOP
      EXECUTE format('REVOKE INSERT (%I), UPDATE (%I), REFERENCES (%I) ON TABLE %s FROM PUBLIC, anon, authenticated',
        attribute.attname, attribute.attname, attribute.attname, relation);
    END LOOP;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %s TO service_role', relation);

    -- Remove permissive write paths. An old ALL policy can also grant reads;
    -- narrow it to SELECT with the same expression, roles and permissiveness.
    FOR old_policy IN SELECT * FROM pg_policy
      WHERE polrelid = relation AND polcmd <> 'r' LOOP
      EXECUTE format('DROP POLICY %I ON %s', old_policy.polname, relation);
      IF old_policy.polcmd = '*' THEN
        SELECT string_agg(CASE WHEN role_id = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(role_id)) END, ', ')
          INTO policy_roles FROM unnest(old_policy.polroles) AS roles(role_id);
        EXECUTE format('CREATE POLICY %I ON %s AS %s FOR SELECT TO %s USING (%s)',
          old_policy.polname, relation,
          CASE WHEN old_policy.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          policy_roles, coalesce(pg_get_expr(old_policy.polqual, relation), 'true'));
      END IF;
    END LOOP;

    -- Defense in depth: accidental future table/column grants and permissive
    -- ownership policies cannot restore client mutations. service_role is not
    -- targeted; its trusted write paths continue to work.
    EXECUTE format('CREATE POLICY commerce_server_insert ON %s AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false)', relation);
    EXECUTE format('CREATE POLICY commerce_server_update ON %s AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false)', relation);
    EXECUTE format('CREATE POLICY commerce_server_delete ON %s AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false)', relation);
  END LOOP;

  -- Revoke every overload, not just the newest signature: earlier checkout
  -- migrations left shorter functions installed. No client calls these RPCs.
  FOR rpc IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN
      ('create_order', 'create_trip_orders', 'request_auth_context', 'request_auth_context_v2') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', rpc.signature);
  END LOOP;

  GRANT EXECUTE ON FUNCTION public.request_auth_context(uuid, uuid) TO service_role;
  GRANT EXECUTE ON FUNCTION public.request_auth_context_v2(uuid, uuid) TO service_role;
  GRANT EXECUTE ON FUNCTION public.create_order(uuid,uuid,uuid,numeric,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric) TO service_role;
  GRANT EXECUTE ON FUNCTION public.create_trip_orders(uuid,uuid,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric) TO service_role;

  -- Fail visibly if unexpected inherited permissions survive. All changes
  -- above are transactional, so a failed deployment cannot be half-applied.
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH table_name IN ARRAY ARRAY['orders', 'order_items', 'trips', 'stores', 'products', 'product_variants'] LOOP
      relation := format('public.%I', table_name)::regclass;
      IF has_table_privilege(api_role, relation, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(api_role, relation, 'INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'Unexpected inherited commerce write privilege for % on %', api_role, relation;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname IN
        ('create_order', 'create_trip_orders', 'request_auth_context', 'request_auth_context_v2')
      AND has_function_privilege(api_role, p.oid, 'EXECUTE')) THEN
      RAISE EXCEPTION 'Private commerce/auth RPC still executable by %', api_role;
    END IF;
  END LOOP;
END;
$hardening$;

COMMIT;
