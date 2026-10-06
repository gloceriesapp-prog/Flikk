\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $$ DECLARE actor text; private_table text; rpc record; field text; BEGIN
 FOREACH actor IN ARRAY ARRAY['anon','authenticated'] LOOP
  FOREACH private_table IN ARRAY ARRAY['delivery_codes','delivery_code_resets','order_refund_jobs'] LOOP
   IF has_table_privilege(actor,format('public.%I',private_table),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(actor,format('public.%I',private_table),'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION '% retains access to %',actor,private_table; END IF;
  END LOOP;
  FOR rpc IN SELECT p.oid,p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN('request_auth_context','request_auth_context_v2','customer_delivery_codes','complete_verified_delivery','reissue_delivery_code','prune_delivery_codes','claim_order_refunds','save_order_refund','retry_order_refund','request_order_refund') LOOP
   IF has_function_privilege(actor,rpc.oid,'EXECUTE') THEN RAISE EXCEPTION '% can call %',actor,rpc.signature; END IF;
  END LOOP;
  FOR field IN SELECT attname FROM pg_attribute WHERE attrelid='public.stores'::regclass AND attnum>0 AND NOT attisdropped
   AND (attname LIKE 'payout_%' OR attname IN('pan_number','gst_number','shop_establishment_number','owner_name')) LOOP
   IF has_column_privilege(actor,'public.stores',field,'SELECT') THEN RAISE EXCEPTION '% can read merchant field %',actor,field; END IF;
  END LOOP;
 END LOOP;
 IF EXISTS(SELECT 1 FROM orders WHERE delivery_otp IS NOT NULL) THEN RAISE EXCEPTION 'Legacy order rows still expose delivery codes'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND tgname='atomic_refund_intent' AND tgenabled<>'D')
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND tgname='atomic_rider_earning' AND tgenabled<>'D')
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND tgname='private_delivery_code' AND tgenabled<>'D')
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.trips'::regclass AND tgname='atomic_trip_refund' AND tgenabled<>'D') THEN
  RAISE EXCEPTION 'Required atomic/privacy trigger missing'; END IF;
END $$;
ROLLBACK;
SELECT 'order safety deployment checks passed' AS result;
