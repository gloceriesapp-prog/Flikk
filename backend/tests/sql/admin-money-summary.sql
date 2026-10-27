\set ON_ERROR_STOP on
-- Migration 20261027120000: admin_money_summary splits what customers paid
-- into the store's share, rider pay and what Gloceries keeps, and shows the
-- balances still owed to stores and riders.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','admin_money_summary(timestamptz,timestamptz)','EXECUTE')
 OR has_function_privilege('authenticated','admin_money_summary(timestamptz,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Money summary exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','admin_money_summary(timestamptz,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'API cannot read money summary'; END IF;
END $$;

-- Rider and cash figures are all-time balances, so they are checked as deltas.
CREATE TEMP TABLE money_baseline AS SELECT admin_money_summary() AS s;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000127a0','Money zone','money-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000127c1','+919999127001','customer',true),
 ('00000000-0000-4000-8000-0000000127d1','+919999127002','store_owner',true),
 ('00000000-0000-4000-8000-0000000127d2','+919999127003','store_owner',true),
 ('00000000-0000-4000-8000-0000000127e1','+919999127004','rider',true);
INSERT INTO riders(user_id,name,phone,status) VALUES('00000000-0000-4000-8000-0000000127e1','Money rider','+919999127004','online');
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000127f1','00000000-0000-4000-8000-0000000127d1','00000000-0000-4000-8000-0000000127a0','Money shop A','grocery','Test',12.97,77.59),
 ('00000000-0000-4000-8000-0000000127f2','00000000-0000-4000-8000-0000000127d2','00000000-0000-4000-8000-0000000127a0','Money shop B','grocery','Test',12.98,77.60);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000127b1','00000000-0000-4000-8000-0000000127c1','1 Money Road','00000000-0000-4000-8000-0000000127a0');
INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total,provider_payment_id,handling_fee,discount_amount) VALUES
 ('00000000-0000-4000-8000-000000012711','00000000-0000-4000-8000-0000000127c1','00000000-0000-4000-8000-0000000127b1',45,200,255,'pay_money_trip',10,0);
INSERT INTO orders(id,trip_id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,handling_fee,discount_amount,total,payment_method,provider_payment_id,status,rider_id,placed_at,delivered_at) VALUES
 -- In the window: one single-store order with a ₹5 promo, and one two-store trip.
 ('00000000-0000-4000-8000-000000012701',null,'00000000-0000-4000-8000-0000000127c1','00000000-0000-4000-8000-0000000127f1','00000000-0000-4000-8000-0000000127b1',100,30,4,10,5,135,'cod',null,'delivered','00000000-0000-4000-8000-0000000127e1','2001-01-02 10:00+05:30','2001-01-02 10:30+05:30'),
 ('00000000-0000-4000-8000-000000012702','00000000-0000-4000-8000-000000012711','00000000-0000-4000-8000-0000000127c1','00000000-0000-4000-8000-0000000127f1','00000000-0000-4000-8000-0000000127b1',100,0,3,0,0,0,'online','pay_money_trip','delivered','00000000-0000-4000-8000-0000000127e1','2001-01-03 10:00+05:30','2001-01-03 10:30+05:30'),
 ('00000000-0000-4000-8000-000000012703','00000000-0000-4000-8000-000000012711','00000000-0000-4000-8000-0000000127c1','00000000-0000-4000-8000-0000000127f2','00000000-0000-4000-8000-0000000127b1',100,0,2,0,0,0,'online','pay_money_trip','delivered','00000000-0000-4000-8000-0000000127e1','2001-01-03 10:00+05:30','2001-01-03 10:40+05:30'),
 -- Outside the window: counts toward what store B is owed, not this period's earnings.
 ('00000000-0000-4000-8000-000000012704',null,'00000000-0000-4000-8000-0000000127c1','00000000-0000-4000-8000-0000000127f2','00000000-0000-4000-8000-0000000127b1',50,30,1,10,0,90,'online','pay_money_late','delivered','00000000-0000-4000-8000-0000000127e1','2001-02-01 10:00+05:30','2001-02-01 10:30+05:30'),
 -- Cancelled: never earned, never owed.
 ('00000000-0000-4000-8000-000000012705',null,'00000000-0000-4000-8000-0000000127c1','00000000-0000-4000-8000-0000000127f1','00000000-0000-4000-8000-0000000127b1',500,30,20,10,0,540,'online','pay_money_cancel','cancelled',null,'2001-01-04 10:00+05:30',null);
INSERT INTO rider_earnings(rider_id,order_id,trip_id,amount,paid_at,earned_at) VALUES
 ('00000000-0000-4000-8000-0000000127e1','00000000-0000-4000-8000-000000012701',null,25,null,'2001-01-02 10:30+05:30'),
 ('00000000-0000-4000-8000-0000000127e1','00000000-0000-4000-8000-000000012703','00000000-0000-4000-8000-000000012711',40,'2001-01-10 10:00+05:30','2001-01-03 10:40+05:30'),
 ('00000000-0000-4000-8000-0000000127e1','00000000-0000-4000-8000-000000012704',null,25,null,'2001-02-01 10:30+05:30');
INSERT INTO rider_cash_collections(rider_id,order_id,amount,collected_at) VALUES
 ('00000000-0000-4000-8000-0000000127e1','00000000-0000-4000-8000-000000012701',135,'2001-01-02 10:30+05:30');
INSERT INTO payouts(store_id,week_start,week_end,gross_amount,commission_deducted,net_payout,status,paid_at,utr,payment_mode,payee_snapshot) VALUES
 ('00000000-0000-4000-8000-0000000127f1','2000-12-25','2000-12-31',104,4,100,'paid','2001-01-01 12:00+05:30','UTRMONEY01','upi','{"upi":"shop@upi"}'),
 ('00000000-0000-4000-8000-0000000127f2','2001-01-01','2001-01-07',52,2,50,'pending',null,null,null,null);
SET LOCAL session_replication_role=origin;

DO $$ DECLARE s jsonb; b jsonb; e jsonb; a jsonb; bb jsonb; BEGIN
 s:=admin_money_summary('2001-01-01 00:00+05:30','2001-01-08 00:00+05:30');
 e:=s->'earned';
 IF (e->>'deliveries')::int<>2 THEN RAISE EXCEPTION 'A trip must count once: %', e; END IF;
 IF (e->>'customerPaid')::numeric<>390 OR (e->>'itemSales')::numeric<>300 OR (e->>'commission')::numeric<>9
 OR (e->>'platformFee')::numeric<>20 OR (e->>'deliveryFees')::numeric<>75 OR (e->>'riderPay')::numeric<>65
 OR (e->>'deliveryMargin')::numeric<>10 OR (e->>'discounts')::numeric<>5 OR (e->>'storeShare')::numeric<>291
 OR (e->>'net')::numeric<>34 THEN RAISE EXCEPTION 'Period earnings wrong: %', e; END IF;
 -- Every rupee the customer paid is accounted for exactly once.
 IF (e->>'storeShare')::numeric+(e->>'riderPay')::numeric+(e->>'net')::numeric<>(e->>'customerPaid')::numeric THEN RAISE EXCEPTION 'Split does not add up: %', e; END IF;

 SELECT r INTO a FROM jsonb_array_elements(s->'stores'->'rows') r WHERE r->>'storeId'='00000000-0000-4000-8000-0000000127f1';
 IF (a->>'periodSales')::numeric<>200 OR (a->>'periodCommission')::numeric<>7 OR (a->>'periodShare')::numeric<>193
 OR (a->>'owedTotal')::numeric<>193 OR (a->>'paid')::numeric<>100 OR (a->>'inPayouts')::numeric<>0
 OR (a->>'notBatched')::numeric<>93 OR (a->>'outstanding')::numeric<>93 THEN RAISE EXCEPTION 'Store A wrong: %', a; END IF;
 SELECT r INTO bb FROM jsonb_array_elements(s->'stores'->'rows') r WHERE r->>'storeId'='00000000-0000-4000-8000-0000000127f2';
 IF (bb->>'periodShare')::numeric<>98 OR (bb->>'owedTotal')::numeric<>147 OR (bb->>'paid')::numeric<>0
 OR (bb->>'inPayouts')::numeric<>50 OR (bb->>'notBatched')::numeric<>97 OR (bb->>'outstanding')::numeric<>147 THEN RAISE EXCEPTION 'Store B wrong: %', bb; END IF;

 SELECT m.s INTO b FROM money_baseline m;
 IF (s->'riders'->>'owedTotal')::numeric-(b->'riders'->>'owedTotal')::numeric<>90
 OR (s->'riders'->>'paid')::numeric-(b->'riders'->>'paid')::numeric<>40
 OR (s->'riders'->>'outstanding')::numeric-(b->'riders'->>'outstanding')::numeric<>50 THEN RAISE EXCEPTION 'Rider balance wrong: %', s->'riders'; END IF;
 IF (s->'cash'->>'withRiders')::numeric-(b->'cash'->>'withRiders')::numeric<>135
 OR (s->'cash'->>'collections')::int-(b->'cash'->>'collections')::int<>1 THEN RAISE EXCEPTION 'Cash with riders wrong: %', s->'cash'; END IF;

 -- No window: all-time, so the February order counts too.
 e:=admin_money_summary()->'earned';
 IF (e->>'deliveries')::int-(b->'earned'->>'deliveries')::int<>3 THEN RAISE EXCEPTION 'All-time deliveries wrong: %', e; END IF;
END $$;
ROLLBACK;
