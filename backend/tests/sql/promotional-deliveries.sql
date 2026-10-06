\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_table_privilege('anon','promotional_deliveries','SELECT') OR has_table_privilege('authenticated','promotional_deliveries','INSERT') THEN RAISE EXCEPTION 'Campaign private data exposed'; END IF;
 IF has_function_privilege('anon','claim_promotional_deliveries(integer)','EXECUTE') OR has_function_privilege('authenticated','claim_promotional_deliveries(integer)','EXECUTE') THEN RAISE EXCEPTION 'Public campaign claim permitted'; END IF;
 IF NOT has_function_privilege('service_role','claim_promotional_deliveries(integer)','EXECUTE') THEN RAISE EXCEPTION 'Worker cannot claim'; END IF;
END $$;
-- Existing fixture is transactional: it leaves no accounts/messages behind.
INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-000000000096');
INSERT INTO public.users(id,phone,role) VALUES('00000000-0000-4000-8000-000000000096','+919999990096','customer') ON CONFLICT(id) DO NOTHING;
INSERT INTO promotional_deliveries(campaign_id,customer_id,channel,subject,body)
VALUES('00000000-0000-4000-8000-000000000095','00000000-0000-4000-8000-000000000096','sms','Fixture','Not sent');
DO $$ DECLARE claimed public.promotional_deliveries; BEGIN
 SELECT * INTO claimed FROM claim_promotional_deliveries(1);
 IF claimed.id IS NULL OR claimed.lease_token IS NULL THEN RAISE EXCEPTION 'Claim missing'; END IF;
 IF EXISTS(SELECT 1 FROM claim_promotional_deliveries(1)) THEN RAISE EXCEPTION 'Double claim'; END IF;
 UPDATE promotional_deliveries SET lease_until=now()-interval '1 minute' WHERE id=claimed.id;
 PERFORM claim_promotional_deliveries(1);
 IF NOT EXISTS(SELECT 1 FROM promotional_deliveries WHERE id=claimed.id AND status='uncertain') THEN RAISE EXCEPTION 'Ambiguous SMS retried'; END IF;
END $$;
ROLLBACK;
SELECT 'Campaign permissions and claim recovery verified' AS result;
