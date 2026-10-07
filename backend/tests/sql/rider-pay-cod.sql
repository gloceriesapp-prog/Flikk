\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','rider_delivery_payout(numeric,integer)','EXECUTE') OR has_function_privilege('authenticated','rider_delivery_payout(numeric,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Rider pay RPC exposed to API roles'; END IF;
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

 -- Minimum payout 0 keeps the old rule: pay = delivery fee charged.
 UPDATE delivery_settings SET rider_base_payout=0;
 r:=complete_verified_delivery('00000000-0000-4000-8000-000000000892','00000000-0000-4000-8000-0000000008e1','2222');
 IF NOT (r->>'accepted')::boolean THEN RAISE EXCEPTION 'Prepaid delivery refused: %',r; END IF;
 SELECT * INTO STRICT e FROM rider_earnings WHERE order_id='00000000-0000-4000-8000-000000000892';
 IF e.amount<>25 OR e.base_amount<>25 OR e.extra_stop_amount<>0 THEN RAISE EXCEPTION 'Old pay rule changed: %',e.amount; END IF;
 IF (SELECT amount FROM rider_delivery_payout(55,2))<>55 OR (SELECT extra_stop_amount FROM rider_delivery_payout(55,2))<>30
 OR (SELECT base_amount FROM rider_delivery_payout(0,2))<>0 THEN RAISE EXCEPTION 'Old split rule changed'; END IF;
END $$;
ROLLBACK;
SELECT 'Rider pay settings verified' AS result;
