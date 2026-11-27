\set ON_ERROR_STOP on
-- Admin payment gateway setting (migration 20261128100000). Rolls back.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated flikk_migrations_tests'; END IF; END $$;
BEGIN;
INSERT INTO platform_settings DEFAULT VALUES ON CONFLICT DO NOTHING;
DO $$ DECLARE r jsonb; BEGIN
 IF (SELECT payment_gateway FROM platform_settings ORDER BY id LIMIT 1)<>'razorpay' THEN RAISE EXCEPTION 'Default must be razorpay'; END IF;
 r:=admin_update_payment_gateway('split',10,'ops@example.com');
 IF r->>'payment_gateway'<>'split' OR (r->>'payment_gateway_split_pct')::int<>10 THEN RAISE EXCEPTION 'Split not saved: %',r; END IF;
 r:=admin_update_payment_gateway('cashfree',55,'ops@example.com');
 IF (r->>'payment_gateway_split_pct')::int<>0 THEN RAISE EXCEPTION 'Percent must reset outside split'; END IF;
 BEGIN PERFORM admin_update_payment_gateway('stripe',0,'ops@example.com'); RAISE EXCEPTION 'Unknown gateway saved';
 EXCEPTION WHEN SQLSTATE 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_update_payment_gateway('split',101,'ops@example.com'); RAISE EXCEPTION 'Bad percent saved';
 EXCEPTION WHEN SQLSTATE 'P0422' THEN NULL; END;
 IF (SELECT count(*) FROM admin_control_audit WHERE action='payment_gateway_update')<>2 THEN RAISE EXCEPTION 'Changes must be audited'; END IF;
 IF has_function_privilege('authenticated','public.admin_update_payment_gateway(text,integer,text)','EXECUTE')
  OR has_table_privilege('authenticated','public.admin_payment_reconciliation','SELECT') THEN RAISE EXCEPTION 'Must be service only'; END IF;
END $$;
ROLLBACK;
