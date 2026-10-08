\set ON_ERROR_STOP on
-- Migration 113: configurable dispatch rings, rider capacity, admin dispatch
-- board and weekly rider earning totals.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('authenticated','admin_dispatch_board(boolean,integer,integer)','EXECUTE')
 OR has_function_privilege('anon','admin_rider_earning_weeks(uuid,timestamptz,timestamptz)','EXECUTE')
 OR has_function_privilege('authenticated','nearby_dispatchable_riders(double precision,double precision,double precision)','EXECUTE')
 OR has_function_privilege('anon','rider_capacity_exceeded(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Rider ops RPC exposed to API roles'; END IF;
 IF (SELECT steps FROM dispatch_config())<>'{3000,5000,8000}'::integer[] OR (SELECT step_seconds FROM dispatch_config())<>45
 OR (SELECT max_trips FROM dispatch_config()) IS NOT NULL THEN RAISE EXCEPTION 'Dispatch defaults changed behaviour'; END IF;
 IF (SELECT interval_seconds FROM scheduled_work WHERE name='riderDispatch')<>10 THEN RAISE EXCEPTION 'Dispatch job too slow for short steps'; END IF;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000113a0','Ops zone','ops-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000113c1','+919999113001','customer',true),
 ('00000000-0000-4000-8000-0000000113d1','+919999113002','store_owner',true),
 ('00000000-0000-4000-8000-0000000113e1','+919999113003','rider',true),
 ('00000000-0000-4000-8000-0000000113e2','+919999113004','rider',true);
INSERT INTO riders(user_id,name,phone,status,current_lat,current_lng,last_location_update) VALUES
 ('00000000-0000-4000-8000-0000000113e1','Busy','+919999113003','online',12.9716,77.5946,now()),
 ('00000000-0000-4000-8000-0000000113e2','Free','+919999113004','online',12.9720,77.5950,now());
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000113f1','00000000-0000-4000-8000-0000000113d1','00000000-0000-4000-8000-0000000113a0','Ops shop','grocery','Test',12.9750,77.5980);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000113b1','00000000-0000-4000-8000-0000000113c1','1 Ops Road','00000000-0000-4000-8000-0000000113a0');
INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total,provider_payment_id)
 SELECT ('00000000-0000-4000-8000-00000011371'||n)::uuid,'00000000-0000-4000-8000-0000000113c1','00000000-0000-4000-8000-0000000113b1',40,20,60,'pay_ops_'||n
 FROM generate_series(1,3) n;
-- Trip 1: already out with rider e1. Trips 2/3: packed, waiting, never offered.
INSERT INTO orders(id,trip_id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,provider_payment_id,status,rider_id)
 SELECT ('00000000-0000-4000-8000-00000011372'||t)::uuid,('00000000-0000-4000-8000-00000011371'||t)::uuid,'00000000-0000-4000-8000-0000000113c1',
  '00000000-0000-4000-8000-0000000113f1','00000000-0000-4000-8000-0000000113b1',10,20,1,30,'online','pay_ops_'||t,
  CASE WHEN t=1 THEN 'out_for_delivery' ELSE 'packed' END,
  CASE WHEN t=1 THEN '00000000-0000-4000-8000-0000000113e1'::uuid END
 FROM generate_series(1,3) t;
INSERT INTO rider_earnings(rider_id,order_id,trip_id,amount,base_amount,extra_stop_amount,earned_at,paid_at) VALUES
 ('00000000-0000-4000-8000-0000000113e1','00000000-0000-4000-8000-000000113721',NULL,40,30,10,'2026-09-07 06:00+00',now()),
 ('00000000-0000-4000-8000-0000000113e1','00000000-0000-4000-8000-000000113722',NULL,25,25,0,'2026-09-08 06:00+00',NULL),
 ('00000000-0000-4000-8000-0000000113e2','00000000-0000-4000-8000-000000113723',NULL,30,30,0,'2026-09-15 06:00+00',NULL);
SET LOCAL session_replication_role=origin;

-- 1. Admin rings and step drive advance_dispatch_offers.
DO $$ DECLARE n integer; o orders; BEGIN
 BEGIN UPDATE delivery_settings SET dispatch_radius_steps_m='{100}'; RAISE EXCEPTION 'Tiny ring accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE delivery_settings SET dispatch_step_seconds=5; RAISE EXCEPTION 'Tiny step accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE delivery_settings SET dispatch_radius_steps_m='{4000,2000}',dispatch_step_seconds=20;
 IF (SELECT steps FROM dispatch_config())<>'{2000,4000}'::integer[] THEN RAISE EXCEPTION 'Rings not sorted'; END IF;
 SELECT count(*) INTO n FROM advance_dispatch_offers(1,'00000000-0000-4000-8000-000000113722');
 SELECT * INTO o FROM orders WHERE id='00000000-0000-4000-8000-000000113722';
 IF n<>1 OR o.dispatch_radius_m<>2000 OR o.dispatch_attempts<>1 THEN RAISE EXCEPTION 'First ring not configured: % %',o.dispatch_radius_m,o.dispatch_attempts; END IF;
 -- Inside the step window nothing widens.
 UPDATE orders SET dispatch_broadcast_at=now()-interval '10 seconds' WHERE id='00000000-0000-4000-8000-000000113722';
 PERFORM advance_dispatch_offers(100,NULL);
 IF (SELECT dispatch_radius_m FROM orders WHERE id='00000000-0000-4000-8000-000000113722')<>2000 THEN RAISE EXCEPTION 'Widened before the step'; END IF;
 UPDATE orders SET dispatch_broadcast_at=now()-interval '21 seconds' WHERE id='00000000-0000-4000-8000-000000113722';
 PERFORM advance_dispatch_offers(100,NULL);
 SELECT * INTO o FROM orders WHERE id='00000000-0000-4000-8000-000000113722';
 IF o.dispatch_radius_m<>4000 OR o.dispatch_attempts<>2 THEN RAISE EXCEPTION 'Second ring not configured: %',o.dispatch_radius_m; END IF;
 IF EXISTS(SELECT 1 FROM admin_dispatch_board(true,50,0) WHERE trip_id='00000000-0000-4000-8000-000000113712') THEN RAISE EXCEPTION 'Out of offers before last window'; END IF;
 UPDATE orders SET dispatch_broadcast_at=now()-interval '21 seconds' WHERE id='00000000-0000-4000-8000-000000113722';
 PERFORM advance_dispatch_offers(100,NULL);
 IF (SELECT dispatch_attempts FROM orders WHERE id='00000000-0000-4000-8000-000000113722')<>2 THEN RAISE EXCEPTION 'Advanced past the last ring'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_dispatch_board(true,50,0) WHERE trip_id='00000000-0000-4000-8000-000000113712' AND out_of_offers AND awaiting_rider
  AND dispatch_attempts=2 AND assign_order_id='00000000-0000-4000-8000-000000113722') THEN RAISE EXCEPTION 'Exhausted trip missing from out-of-offers board'; END IF;
 IF EXISTS(SELECT 1 FROM admin_dispatch_board(true,50,0) WHERE trip_id<>'00000000-0000-4000-8000-000000113712') THEN RAISE EXCEPTION 'Out-of-offers filter leaks'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_dispatch_board(false,50,0) WHERE trip_id='00000000-0000-4000-8000-000000113711' AND rider_name='Busy' AND NOT awaiting_rider) THEN
  RAISE EXCEPTION 'Active trip missing from board'; END IF;
 -- Raising the widest ring brings the exhausted order back into automatic dispatch.
 UPDATE delivery_settings SET dispatch_radius_steps_m='{2000,4000,6000}';
 PERFORM advance_dispatch_offers(100,NULL);
 IF (SELECT dispatch_radius_m FROM orders WHERE id='00000000-0000-4000-8000-000000113722')<>6000 THEN RAISE EXCEPTION 'New ring not offered'; END IF;
END $$;

-- 2. Max active trips per rider, on every assignment path.
DO $$ DECLARE r jsonb; BEGIN
 IF (accept_dispatch_offer('00000000-0000-4000-8000-000000113722','00000000-0000-4000-8000-0000000113e1'))->>'accepted'<>'true' THEN
  RAISE EXCEPTION 'No limit should allow a second trip'; END IF;
 UPDATE orders SET rider_id=NULL WHERE id='00000000-0000-4000-8000-000000113722';
 UPDATE delivery_settings SET max_active_trips_per_rider=1;
 IF rider_active_trip_count('00000000-0000-4000-8000-0000000113e1')<>1 THEN RAISE EXCEPTION 'Active trip count wrong'; END IF;
 IF EXISTS(SELECT 1 FROM rider_dispatch_offers('00000000-0000-4000-8000-0000000113e1')) THEN RAISE EXCEPTION 'Rider at capacity sees offers'; END IF;
 IF NOT EXISTS(SELECT 1 FROM rider_dispatch_offers('00000000-0000-4000-8000-0000000113e2')) THEN RAISE EXCEPTION 'Free rider lost offers'; END IF;
 IF EXISTS(SELECT 1 FROM nearby_dispatchable_riders(12.9750,77.5980,8000) WHERE rider_user_id='00000000-0000-4000-8000-0000000113e1')
 OR NOT EXISTS(SELECT 1 FROM nearby_dispatchable_riders(12.9750,77.5980,8000) WHERE rider_user_id='00000000-0000-4000-8000-0000000113e2') THEN
  RAISE EXCEPTION 'Push audience ignores capacity'; END IF;
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000113722','00000000-0000-4000-8000-0000000113e1');
 IF r->>'error' IS DISTINCT FROM 'RIDER_AT_CAPACITY' THEN RAISE EXCEPTION 'Accept over capacity: %',r; END IF;
 BEGIN PERFORM assign_trip_rider('00000000-0000-4000-8000-000000113713','00000000-0000-4000-8000-0000000113e1'); RAISE EXCEPTION 'Assign over capacity';
 EXCEPTION WHEN SQLSTATE 'P0429' THEN NULL; END;
 BEGIN UPDATE orders SET rider_id='00000000-0000-4000-8000-0000000113e1' WHERE id='00000000-0000-4000-8000-000000113723'; RAISE EXCEPTION 'Direct write over capacity';
 EXCEPTION WHEN SQLSTATE 'P0429' THEN NULL; END;
 IF EXISTS(SELECT 1 FROM orders WHERE id IN('00000000-0000-4000-8000-000000113722','00000000-0000-4000-8000-000000113723') AND rider_id IS NOT NULL) THEN
  RAISE EXCEPTION 'Refused assignment wrote a rider'; END IF;
 -- The current trip itself never counts against the rider.
 UPDATE orders SET rider_id='00000000-0000-4000-8000-0000000113e1' WHERE id='00000000-0000-4000-8000-000000113721';
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000113722','00000000-0000-4000-8000-0000000113e2');
 IF NOT (r->>'accepted')::boolean THEN RAISE EXCEPTION 'Free rider refused: %',r; END IF;
 UPDATE delivery_settings SET max_active_trips_per_rider=2;
 IF NOT EXISTS(SELECT 1 FROM assign_trip_rider('00000000-0000-4000-8000-000000113713','00000000-0000-4000-8000-0000000113e1')) THEN RAISE EXCEPTION 'Under-capacity assign refused'; END IF;
END $$;

-- 3. Weekly earning totals (IST Monday weeks), per rider and for everyone.
DO $$ DECLARE w record; BEGIN
 SELECT * INTO w FROM admin_rider_earning_weeks('00000000-0000-4000-8000-0000000113e1','2026-09-01','2026-10-01');
 IF w.week_start<>'2026-09-07' OR w.deliveries<>2 OR w.total<>65 OR w.base<>55 OR w.extra<>10 OR w.paid<>40 OR w.unpaid<>25 THEN
  RAISE EXCEPTION 'Rider week totals wrong: %',w; END IF;
 IF (SELECT count(*) FROM admin_rider_earning_weeks(NULL,'2026-09-01','2026-10-01'))<>2 THEN RAISE EXCEPTION 'All-rider weeks wrong'; END IF;
 IF EXISTS(SELECT 1 FROM admin_rider_earning_weeks(NULL,'2024-01-01','2026-10-01')) THEN RAISE EXCEPTION 'Unbounded range allowed'; END IF;
END $$;
ROLLBACK;
SELECT 'Rider ops dispatch, capacity and earnings verified' AS result;
