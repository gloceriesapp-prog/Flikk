-- Disposable SQL regression tests. Never run against a customer database.
BEGIN;
DO $$ BEGIN IF current_database() <> 'flikk_migrations_tests' THEN RAISE EXCEPTION 'Disposable fixture only'; END IF; END $$;
DO $$
DECLARE e text := repeat('1',64); body_hash text := repeat('2',64); phone_hash text := repeat('3',64); result text; i integer;
BEGIN
  IF has_table_privilege('anon','public.auth_sms_deliveries','SELECT')
    OR has_table_privilege('authenticated','public.auth_sms_budgets','UPDATE')
    OR has_function_privilege('anon','public.claim_send_sms_delivery(text,text,text,integer,integer)','EXECUTE')
    OR has_function_privilege('authenticated','public.finish_send_sms_delivery(text,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.prune_send_sms_deliveries()','EXECUTE') THEN
    RAISE EXCEPTION 'SMS private ledger exposed';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.auth_sms_deliveries'::regclass)
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.auth_sms_budgets'::regclass) THEN RAISE EXCEPTION 'SMS RLS absent'; END IF;
  result := public.claim_send_sms_delivery(e,body_hash,phone_hash,100,10000);
  IF result <> 'claimed' THEN RAISE EXCEPTION 'First SMS not claimed'; END IF;
  IF public.claim_send_sms_delivery(e,body_hash,phone_hash,100,10000) <> 'blocked' THEN RAISE EXCEPTION 'Concurrent in-flight replay allowed'; END IF;
  PERFORM public.finish_send_sms_delivery(e,'sent');
  PERFORM public.finish_send_sms_delivery(e,'sent');
  IF public.claim_send_sms_delivery(e,body_hash,phone_hash,100,10000) <> 'sent' THEN RAISE EXCEPTION 'Accepted replay not idempotent'; END IF;
  IF public.claim_send_sms_delivery(e,repeat('4',64),phone_hash,100,10000) <> 'blocked' THEN RAISE EXCEPTION 'Changed replay accepted'; END IF;
  IF public.claim_send_sms_delivery(repeat('5',64),body_hash,phone_hash,100,10000) <> 'blocked' THEN RAISE EXCEPTION 'Phone minute budget bypassed'; END IF;
  BEGIN PERFORM public.finish_send_sms_delivery(e,'failed'); RAISE EXCEPTION 'FAIL: terminal outcome overwritten';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'SMS delivery outcome conflict' THEN RAISE; END IF; END;
  FOR i IN 1..5 LOOP
    -- Move only the minute test window to simulate later minutes within one hour.
    DELETE FROM public.auth_sms_budgets WHERE bucket = 'phone:minute:' || phone_hash;
    result := public.claim_send_sms_delivery(md5('hour'||i)::text || md5('event'||i),body_hash,phone_hash,100,10000);
  END LOOP;
  IF result <> 'blocked' THEN RAISE EXCEPTION 'Phone hourly budget bypassed'; END IF;
  IF public.claim_send_sms_delivery(repeat('6',64),body_hash,repeat('7',64),1,10000) <> 'blocked' THEN RAISE EXCEPTION 'Global minute budget bypassed'; END IF;
  IF public.claim_send_sms_delivery(repeat('8',64),body_hash,repeat('9',64),100,1) <> 'blocked' THEN RAISE EXCEPTION 'Daily spend guard bypassed'; END IF;
  BEGIN PERFORM public.claim_send_sms_delivery(NULL,body_hash,phone_hash,100,10000); RAISE EXCEPTION 'FAIL: null claim accepted';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Invalid SMS delivery claim' THEN RAISE; END IF; END;
  DELETE FROM public.auth_sms_budgets;
  IF public.claim_send_sms_delivery(repeat('a',64),body_hash,phone_hash,100,10000) <> 'claimed' THEN RAISE EXCEPTION 'Unknown test claim failed'; END IF;
  PERFORM public.finish_send_sms_delivery(repeat('a',64),'unknown');
  IF public.claim_send_sms_delivery(repeat('a',64),body_hash,phone_hash,100,10000) <> 'blocked' THEN RAISE EXCEPTION 'Ambiguous SMS retried'; END IF;
  INSERT INTO public.auth_sms_deliveries(event_key,payload_hash,created_at) VALUES(repeat('b',64),body_hash,now()-interval '2 days');
  IF public.prune_send_sms_deliveries() <> 1 THEN RAISE EXCEPTION 'Expired receipts not pruned'; END IF;
END $$;
ROLLBACK;
SELECT 'SMS private grants, idempotency, terminal outcomes, quotas and retention verified' AS result;
