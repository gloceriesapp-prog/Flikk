\set ON_ERROR_STOP on
-- Run ONLY after checkout-eligibility.sql in a disposable database.
DO $$ BEGIN
 IF current_database() <> 'flikk_checkout_tests' THEN RAISE EXCEPTION 'Use isolated flikk_checkout_tests'; END IF;
END $$;

CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, phone text, deleted_at timestamptz, banned_until timestamptz);
CREATE TABLE auth.sessions(id uuid PRIMARY KEY, user_id uuid, not_after timestamptz);
CREATE TABLE public.users(id uuid PRIMARY KEY, role text, is_approved boolean);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE PUBLICATION supabase_realtime;
ALTER ROLE service_role BYPASSRLS;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public, auth TO service_role;
ALTER TABLE stores ADD COLUMN owner_user_id uuid;
UPDATE stores SET owner_user_id = '00000000-0000-4000-8000-000000000003';

-- Reproduce Supabase's explicit default grants. A PUBLIC-only revoke in
-- migrations 069/071 previously passed local tests but failed on real grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
\i backend/migrations/069_request_auth_context.sql
\i backend/migrations/071_auth_session_expiry.sql
DO $$ BEGIN
 IF has_function_privilege('anon','public.request_auth_context(uuid,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.request_auth_context_v2(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Auth migration fails with explicit API default grants';
 END IF;
END $$;

-- Simulate an already-deployed vulnerable database, including old overloads,
-- column grants and a legacy ALL policy whose read access must survive.
GRANT EXECUTE ON FUNCTION request_auth_context(uuid,uuid), request_auth_context_v2(uuid,uuid) TO anon, authenticated;
GRANT ALL ON orders, order_items, trips, stores, products, product_variants TO PUBLIC, anon, authenticated;
GRANT INSERT (approval_status), UPDATE (approval_status), REFERENCES (id) ON products TO authenticated;
CREATE FUNCTION create_order(uuid,uuid,uuid,numeric,numeric,numeric,numeric,jsonb,uuid,legacy_discount numeric)
 RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT $1 $$;
CREATE FUNCTION create_trip_orders(uuid,uuid,numeric,numeric,numeric,jsonb,uuid,legacy_discount numeric)
 RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT $1 $$;
CREATE POLICY orders_customer_insert ON orders FOR INSERT WITH CHECK(customer_id = auth.uid());
CREATE POLICY orders_customer_read ON orders FOR SELECT USING(customer_id = auth.uid());
CREATE POLICY stores_owner_write ON stores FOR ALL USING(owner_user_id = auth.uid()) WITH CHECK(owner_user_id = auth.uid());
CREATE POLICY products_read_all ON products FOR SELECT USING(true);
CREATE POLICY products_owner_write ON products FOR INSERT WITH CHECK(store_id IN(SELECT id FROM stores WHERE owner_user_id = auth.uid()));
CREATE POLICY products_owner_update ON products FOR UPDATE USING(store_id IN(SELECT id FROM stores WHERE owner_user_id = auth.uid()));
CREATE POLICY variants_read_all ON product_variants FOR SELECT USING(true);
CREATE POLICY items_read_all ON order_items FOR SELECT USING(true);
CREATE POLICY trips_customer_read ON trips FOR SELECT USING(customer_id = auth.uid());
INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000003','synthetic-phone',null,null);
INSERT INTO public.users VALUES ('00000000-0000-4000-8000-000000000003','store_owner',true);
INSERT INTO auth.sessions VALUES ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003',null);
CREATE OR REPLACE FUNCTION checkout_clock() RETURNS timestamptz LANGUAGE sql VOLATILE AS $$
 SELECT '2026-10-04 06:30:00+00'::timestamptz
$$;

\i backend/migrations/078_server_owned_commerce_writes.sql
-- Rerunning must be safe; all existing reads, data and current RPCs survive.
\i backend/migrations/078_server_owned_commerce_writes.sql

CREATE FUNCTION public.assert_commerce_denied(command text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN
  EXECUTE command;
 EXCEPTION WHEN insufficient_privilege THEN RETURN;
 END;
 RAISE EXCEPTION 'Client mutation unexpectedly allowed: %', command;
END $$;
GRANT EXECUTE ON FUNCTION assert_commerce_denied(text) TO anon, authenticated;

SET ROLE anon;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['orders','order_items','trips','stores','products','product_variants'] LOOP
  PERFORM assert_commerce_denied(format('INSERT INTO public.%I DEFAULT VALUES',t));
  PERFORM assert_commerce_denied(format('UPDATE public.%I SET id=id',t));
  PERFORM assert_commerce_denied(format('DELETE FROM public.%I',t));
  PERFORM assert_commerce_denied(format('TRUNCATE public.%I',t));
 END LOOP;
 PERFORM assert_commerce_denied('SELECT public.request_auth_context(null::uuid,null::uuid)');
 PERFORM assert_commerce_denied('SELECT public.request_auth_context_v2(null::uuid,null::uuid)');
END $$;
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
SET ROLE authenticated;
DO $$ DECLARE t text; count_seen integer; BEGIN
 FOREACH t IN ARRAY ARRAY['orders','order_items','trips','stores','products','product_variants'] LOOP
  PERFORM assert_commerce_denied(format('INSERT INTO public.%I DEFAULT VALUES',t));
  PERFORM assert_commerce_denied(format('UPDATE public.%I SET id=id',t));
  PERFORM assert_commerce_denied(format('DELETE FROM public.%I',t));
  PERFORM assert_commerce_denied(format('TRUNCATE public.%I',t));
 END LOOP;
 PERFORM assert_commerce_denied('UPDATE products SET approval_status=''approved''');
 PERFORM assert_commerce_denied('UPDATE stores SET is_active=true');
 PERFORM assert_commerce_denied('SELECT public.request_auth_context(null::uuid,null::uuid)');
 PERFORM assert_commerce_denied('SELECT public.request_auth_context_v2(null::uuid,null::uuid)');
 PERFORM assert_commerce_denied('SELECT public.create_order(null::uuid,null::uuid,null::uuid,0::numeric,0::numeric,0::numeric,0::numeric,''[]''::jsonb,null::uuid,legacy_discount=>0::numeric)');
 PERFORM assert_commerce_denied('SELECT public.create_trip_orders(null::uuid,null::uuid,0::numeric,0::numeric,0::numeric,''[]''::jsonb,null::uuid,legacy_discount=>0::numeric)');
 PERFORM assert_commerce_denied('SELECT public.create_order(null::uuid,null::uuid,null::uuid,0::numeric,0::numeric,0::numeric,0::numeric,''[]''::jsonb,null::uuid,0::numeric,''cod'',0::numeric)');
 SELECT count(*) INTO count_seen FROM stores;
 IF count_seen <> 2 THEN RAISE EXCEPTION 'Owner read access lost'; END IF;
 SELECT count(*) INTO count_seen FROM products;
 IF count_seen <> 2 THEN RAISE EXCEPTION 'Product read access lost'; END IF;
END $$;
RESET ROLE;

-- Both roles are denied regardless of a customer's role claim. Approved
-- owners still edit via /partner; the backend uses service_role, not their JWT.
SET ROLE service_role;
DO $$ DECLARE o public.orders; t public.trips; BEGIN
 IF NOT (SELECT session_valid FROM request_auth_context_v2(
  '00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004')) THEN
  RAISE EXCEPTION 'Trusted auth lookup stopped working';
 END IF;
 UPDATE products SET stock_quantity=10,approval_status='approved';
 o := test_order(1);
 IF o.id IS NULL THEN RAISE EXCEPTION 'Trusted checkout failed'; END IF;
 t := create_trip_orders(
  '00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',35,20,55,
  '[{"store_id":"00000000-0000-4000-8000-000000000010","item_total":10,"commission_amount":1,"items":[{"product_id":"00000000-0000-4000-8000-000000000100","quantity":1,"unit_price_at_order":10}]},
    {"store_id":"00000000-0000-4000-8000-000000000020","item_total":10,"commission_amount":1,"items":[{"product_id":"00000000-0000-4000-8000-000000000200","quantity":1,"unit_price_at_order":10}]}]'::jsonb,
  null,0,'cod',0);
 IF t.id IS NULL OR (SELECT count(*) FROM orders WHERE trip_id=t.id)<>2 THEN
  RAISE EXCEPTION 'Trusted multi-shop checkout failed';
 END IF;
 UPDATE stores SET is_active=false WHERE id='00000000-0000-4000-8000-000000000010';
 UPDATE stores SET is_active=true WHERE id='00000000-0000-4000-8000-000000000010';
 UPDATE products SET approval_status='pending' WHERE id='00000000-0000-4000-8000-000000000200';
END $$;
RESET ROLE;

-- Defense-in-depth test: even a future accidental grant plus permissive
-- policy cannot restore mutations. All temporary grants are rolled back.
BEGIN;
GRANT INSERT, UPDATE, DELETE ON stores, products, orders TO authenticated;
CREATE POLICY accidental_stores ON stores FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY accidental_products ON products FOR ALL USING(true) WITH CHECK(true);
CREATE POLICY accidental_orders ON orders FOR ALL USING(true) WITH CHECK(true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE affected integer; BEGIN
 PERFORM assert_commerce_denied('INSERT INTO stores(id,owner_user_id,is_active) VALUES(gen_random_uuid(),auth.uid(),true)');
 PERFORM assert_commerce_denied('INSERT INTO products(id,approval_status) VALUES(gen_random_uuid(),''approved'')');
 PERFORM assert_commerce_denied('INSERT INTO orders(id,customer_id,address_id,store_id,status,total) VALUES(gen_random_uuid(),auth.uid(),''00000000-0000-4000-8000-000000000002'',''00000000-0000-4000-8000-000000000010'',''delivered'',0)');
 UPDATE products SET approval_status='approved'; GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Restrictive update guard bypassed'; END IF;
 DELETE FROM stores; GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Restrictive delete guard bypassed'; END IF;
END $$;
ROLLBACK;
SELECT 'commerce security: client writes/RPCs denied; reads and service checkout preserved' AS result;
