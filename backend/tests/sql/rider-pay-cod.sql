\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','rider_delivery_payout(numeric,integer)','EXECUTE') OR has_function_privilege('authenticated','rider_delivery_payout(numeric,integer)','EXECUTE')
 OR has_function_privilege('anon','settle_rider_cash(uuid,uuid,text,uuid[])','EXECUTE') OR has_function_privilege('authenticated','settle_rider_cash(uuid,uuid,text,uuid[])','EXECUTE')
 OR has_function_privilege('authenticated','rider_cash_outstanding()','EXECUTE') OR has_function_privilege('authenticated','cod_cash_due(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Rider pay or cash RPC exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','settle_rider_cash(uuid,uuid,text,uuid[])','EXECUTE')
 OR NOT has_function_privilege('service_role','rider_cash_outstanding()','EXECUTE') THEN RAISE EXCEPTION 'API cannot settle cash'; END IF;
 IF has_table_privilege('authenticated','rider_cash_collections','INSERT') OR has_table_privilege('authenticated','rider_cash_collections','UPDATE')
 OR has_table_privilege('anon','rider_cash_collections','UPDATE') THEN RAISE EXCEPTION 'Cash collections writable by API roles'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.rider_cash_collections'::regclass) THEN RAISE EXCEPTION 'Cash collections without RLS'; END IF;
END $$;

-- Fixture rows bypass checkout triggers; every assertion below runs with them on.
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000008a0','Pay zone','pay-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000008c1','+919999980001','customer',true),
 ('00000000-0000-4000-8000-0000000008d1','+919999980002','store_owner',true),
 ('00000000-0000-4000-8000-0000000008d2','+919999980003','store_owner',true),
 ('00000000-0000-4000-8000-0000000008d3','+919999980004','store_owner',true),
 ('00000000-0000-4000-8000-0000000008e1','+919999980005','rider',true);
INSERT INTO riders(user_id,name,phone,status) VALUES('00000000-0000-4000-8000-0000000008e1','Pay rider','+919999980005','online');
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000008f1','00000000-0000-4000-8000-0000000008d1','00000000-0000-4000-8000-0000000008a0','Pay one','grocery','Test',12.9750,77.5980),
 ('00000000-0000-4000-8000-0000000008f2','00000000-0000-4000-8000-0000000008d2','00000000-0000-4000-8000-0000000008a0','Pay two','grocery','Test',12.9800,77.6000),
 ('00000000-0000-4000-8000-0000000008f3','00000000-0000-4000-8000-0000000008d3','00000000-0000-4000-8000-0000000008a0','Pay three','grocery','Test',12.9810,77.6010);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000008b1','00000000-0000-4000-8000-0000000008c1','2 Pay Road','00000000-0000-4000-8000-0000000008a0');
-- 891: free-delivery COD order. 892: prepaid order with a 25 fee.
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,provider_payment_id,status,rider_id) VALUES
 ('00000000-0000-4000-8000-000000000891','00000000-0000-4000-8000-0000000008c1','00000000-0000-4000-8000-0000000008f1','00000000-0000-4000-8000-0000000008b1',200,0,1,200,'cod',null,'out_for_delivery','00000000-0000-4000-8000-0000000008e1'),
 ('00000000-0000-4000-8000-000000000892','00000000-0000-4000-8000-0000000008c1','00000000-0000-4000-8000-0000000008f1','00000000-0000-4000-8000-0000000008b1',100,25,1,125,'online','pay_rider_pay_892','out_for_delivery','00000000-0000-4000-8000-0000000008e1');
-- Trip 881: free-delivery COD, three shops, shop three cancelled before pickup.
INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total) VALUES
 ('00000000-0000-4000-8000-000000000881','00000000-0000-4000-8000-0000000008c1','00000000-0000-4000-8000-0000000008b1',0,300,300);
INSERT INTO orders(id,trip_id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,status,rider_id)
 SELECT ('00000000-0000-4000-8000-00000000088'||s)::uuid,'00000000-0000-4000-8000-000000000881','00000000-0000-4000-8000-0000000008c1',
  ('00000000-0000-4000-8000-0000000008f'||s)::uuid,'00000000-0000-4000-8000-0000000008b1',100,0,1,100,'cod',
  CASE WHEN s=3 THEN 'cancelled' ELSE 'out_for_delivery' END,'00000000-0000-4000-8000-0000000008e1'
 FROM generate_series(1,3) s;
INSERT INTO delivery_codes(scope_id,customer_id,code,expires_at) VALUES
 ('00000000-0000-4000-8000-000000000891','00000000-0000-4000-8000-0000000008c1','1111',now()+interval '1 hour'),
 ('00000000-0000-4000-8000-000000000892','00000000-0000-4000-8000-0000000008c1','2222',now()+interval '1 hour'),
 ('00000000-0000-4000-8000-000000000881','00000000-0000-4000-8000-0000000008c1','3333',now()+interval '1 hour');
SET LOCAL session_replication_role=origin;

UPDATE delivery_settings SET rider_base_payout=30,rider_extra_stop_payout=12,extra_stop_fee=15;

-- Rider pay: minimum payout on free delivery, extra-shop payout per extra shop.
DO $$ DECLARE r jsonb; e rider_earnings; BEGIN
 r:=complete_verified_delivery('00000000-0000-4000-8000-000000000891','00000000-0000-4000-8000-0000000008e1','1111');
 IF NOT (r->>'accepted')::boolean THEN RAISE EXCEPTION 'Order delivery refused: %',r; END IF;
 SELECT * INTO STRICT e FROM rider_earnings WHERE order_id='00000000-0000-4000-8000-000000000891';
 IF e.amount<>30 OR e.base_amount<>30 OR e.extra_stop_amount<>0 THEN
  RAISE EXCEPTION 'Free-delivery order did not pay the minimum payout: % % %',e.amount,e.base_amount,e.extra_stop_amount; END IF;

 r:=complete_verified_delivery('00000000-0000-4000-8000-000000000881','00000000-0000-4000-8000-0000000008e1','3333');
 IF NOT (r->>'accepted')::boolean THEN RAISE EXCEPTION 'Trip delivery refused: %',r; END IF;
 SELECT * INTO STRICT e FROM rider_earnings WHERE trip_id='00000000-0000-4000-8000-000000000881';
 -- Two shops visited (the cancelled shop is not a stop): 30 + 1 x 12.
 IF e.amount<>42 OR e.base_amount<>30 OR e.extra_stop_amount<>12 THEN
  RAISE EXCEPTION 'Trip earning ignores extra-shop payout: % % %',e.amount,e.base_amount,e.extra_stop_amount; END IF;
 -- The customer's extra-shop fee is not paid twice: fee 41 = 26 + 15 for one extra shop.
 IF (SELECT amount FROM rider_delivery_payout(41,1))<>42 OR (SELECT base_amount FROM rider_delivery_payout(60,1))<>45
 OR (SELECT amount FROM rider_delivery_payout(60,1))<>57 THEN
  RAISE EXCEPTION 'Extra shops paid twice: %',(SELECT amount FROM rider_delivery_payout(41,1)); END IF;

 -- Minimum payout 0 keeps the old rule: pay = delivery fee charged.
 UPDATE delivery_settings SET rider_base_payout=0;
 r:=complete_verified_delivery('00000000-0000-4000-8000-000000000892','00000000-0000-4000-8000-0000000008e1','2222');
 IF NOT (r->>'accepted')::boolean THEN RAISE EXCEPTION 'Prepaid delivery refused: %',r; END IF;
 SELECT * INTO STRICT e FROM rider_earnings WHERE order_id='00000000-0000-4000-8000-000000000892';
 IF e.amount<>25 OR e.base_amount<>25 OR e.extra_stop_amount<>0 THEN RAISE EXCEPTION 'Old pay rule changed: %',e.amount; END IF;
 IF (SELECT sum(base) FROM rider_earning_totals('00000000-0000-4000-8000-0000000008e1',now()-interval '1 day',now()+interval '1 day'))<>85
 OR (SELECT sum(extra) FROM rider_earning_totals('00000000-0000-4000-8000-0000000008e1',now()-interval '1 day',now()+interval '1 day'))<>12 THEN
  RAISE EXCEPTION 'Earnings day totals ignore the stored split'; END IF;
 IF (SELECT amount FROM rider_delivery_payout(55,2))<>55 OR (SELECT extra_stop_amount FROM rider_delivery_payout(55,2))<>30
 OR (SELECT base_amount FROM rider_delivery_payout(0,2))<>0 THEN RAISE EXCEPTION 'Old split rule changed'; END IF;
END $$;

-- Cash on delivery: one collection per delivered COD order or trip, none when prepaid.
DO $$ DECLARE r jsonb; BEGIN
 IF (SELECT count(*) FROM rider_cash_collections WHERE order_id='00000000-0000-4000-8000-000000000891')<>1
 OR (SELECT amount FROM rider_cash_collections WHERE order_id='00000000-0000-4000-8000-000000000891')<>200 THEN
  RAISE EXCEPTION 'COD order collection missing or wrong'; END IF;
 -- Trip total 300 less the cancelled shop's 100.
 IF (SELECT count(*) FROM rider_cash_collections WHERE trip_id='00000000-0000-4000-8000-000000000881')<>1
 OR (SELECT amount FROM rider_cash_collections WHERE trip_id='00000000-0000-4000-8000-000000000881')<>200
 OR EXISTS(SELECT 1 FROM rider_cash_collections WHERE order_id IN('00000000-0000-4000-8000-000000000881','00000000-0000-4000-8000-000000000882')) THEN
  RAISE EXCEPTION 'COD trip collection missing or wrong'; END IF;
 IF EXISTS(SELECT 1 FROM rider_cash_collections WHERE order_id='00000000-0000-4000-8000-000000000892') THEN
  RAISE EXCEPTION 'Prepaid delivery recorded as cash'; END IF;
 -- Replays (same order, sibling leg) record nothing more.
 r:=complete_verified_delivery('00000000-0000-4000-8000-000000000891','00000000-0000-4000-8000-0000000008e1','1111');
 IF NOT (r->>'replayed')::boolean THEN RAISE EXCEPTION 'Order replay not detected: %',r; END IF;
 r:=complete_verified_delivery('00000000-0000-4000-8000-000000000882','00000000-0000-4000-8000-0000000008e1','3333');
 IF NOT (r->>'replayed')::boolean THEN RAISE EXCEPTION 'Sibling replay not detected: %',r; END IF;
 IF (SELECT count(*) FROM rider_cash_collections WHERE rider_id='00000000-0000-4000-8000-0000000008e1')<>2 THEN
  RAISE EXCEPTION 'Replay recorded cash twice'; END IF;
END $$;

-- Settlement.
DO $$ DECLARE r jsonb; one uuid; o record; BEGIN
 SELECT * INTO STRICT o FROM rider_cash_outstanding() WHERE rider_id='00000000-0000-4000-8000-0000000008e1';
 IF o.outstanding_amount<>400 OR o.outstanding_count<>2 THEN RAISE EXCEPTION 'Outstanding cash wrong: %',o; END IF;
 BEGIN PERFORM settle_rider_cash('00000000-0000-4000-8000-0000000008e1',null,'x'); RAISE EXCEPTION 'Settled without an admin';
 EXCEPTION WHEN sqlstate '22023' THEN NULL; END;
 SELECT id INTO one FROM rider_cash_collections WHERE order_id='00000000-0000-4000-8000-000000000891';
 r:=settle_rider_cash('00000000-0000-4000-8000-0000000008e1','00000000-0000-4000-8000-0000000008ff','  RCPT-1  ',ARRAY[one]);
 IF (r->>'settled_count')::int<>1 OR (r->>'settled_amount')::numeric<>200 THEN RAISE EXCEPTION 'Partial settlement wrong: %',r; END IF;
 IF NOT EXISTS(SELECT 1 FROM rider_cash_collections WHERE id=one AND settled_at IS NOT NULL
  AND settled_by='00000000-0000-4000-8000-0000000008ff' AND settlement_ref='RCPT-1') THEN RAISE EXCEPTION 'Settlement not recorded'; END IF;
 IF (SELECT outstanding_amount FROM rider_cash_outstanding() WHERE rider_id='00000000-0000-4000-8000-0000000008e1')<>200 THEN
  RAISE EXCEPTION 'Settled cash still outstanding'; END IF;
 r:=settle_rider_cash('00000000-0000-4000-8000-0000000008e1','00000000-0000-4000-8000-0000000008ff','');
 IF (r->>'settled_count')::int<>1 OR (r->>'settled_amount')::numeric<>200 THEN RAISE EXCEPTION 'Full settlement wrong: %',r; END IF;
 r:=settle_rider_cash('00000000-0000-4000-8000-0000000008e1','00000000-0000-4000-8000-0000000008ff','again');
 IF (r->>'settled_count')::int<>0 THEN RAISE EXCEPTION 'Settlement not idempotent: %',r; END IF;
 IF (SELECT settlement_ref FROM rider_cash_collections WHERE id=one)<>'RCPT-1' THEN RAISE EXCEPTION 'Settled row overwritten'; END IF;
 IF EXISTS(SELECT 1 FROM rider_cash_outstanding() WHERE rider_id='00000000-0000-4000-8000-0000000008e1') THEN RAISE EXCEPTION 'Rider still owes cash'; END IF;
END $$;
ROLLBACK;
SELECT 'Rider pay settings and cash on delivery verified' AS result;
