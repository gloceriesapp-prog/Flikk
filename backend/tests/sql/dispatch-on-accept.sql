\set ON_ERROR_STOP on
-- Migration 20261026090000: rider search starts once the store accepts an
-- order (after dispatch_after_accept_seconds), riders may accept before it is
-- packed, and the widest ring repeats instead of going silent.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','order_awaits_rider(text,timestamptz)','EXECUTE')
 OR has_function_privilege('authenticated','order_awaits_rider(text,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Dispatch helper exposed to API roles'; END IF;
 IF (SELECT dispatch_after_accept_seconds FROM delivery_settings LIMIT 1)<>15 THEN RAISE EXCEPTION 'Accept delay default is not 15 s'; END IF;
 BEGIN UPDATE delivery_settings SET dispatch_after_accept_seconds=601; RAISE EXCEPTION 'Accept delay above 10 min accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE delivery_settings SET dispatch_radius_steps_m='{3000,5000,8000}',dispatch_step_seconds=45,max_active_trips_per_rider=NULL;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000260a0','Accept zone','accept-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000260c1','+919999260001','customer',true),
 ('00000000-0000-4000-8000-0000000260d1','+919999260002','store_owner',true),
 ('00000000-0000-4000-8000-0000000260e1','+919999260003','rider',true),
 ('00000000-0000-4000-8000-0000000260e2','+919999260004','rider',true);
INSERT INTO riders(user_id,name,phone,status,current_lat,current_lng,last_location_update) VALUES
 ('00000000-0000-4000-8000-0000000260e1','Near','+919999260003','online',12.9716,77.5946,now()),
 ('00000000-0000-4000-8000-0000000260e2','Admin pick','+919999260004','online',12.9720,77.5950,now());
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000260f1','00000000-0000-4000-8000-0000000260d1','00000000-0000-4000-8000-0000000260a0','Accept shop','grocery','Test',12.9750,77.5980);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000260b1','00000000-0000-4000-8000-0000000260c1','1 Accept Road','00000000-0000-4000-8000-0000000260a0');
-- 1: accepted 5 s ago. 2: not accepted yet. 3: accepted long ago, already at
-- the widest ring. 4: accepted, for the admin assign path.
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,status,store_visible_at,accepted_at,dispatch_radius_m,dispatch_broadcast_at,dispatch_attempts)
 VALUES
 ('00000000-0000-4000-8000-000000026001','00000000-0000-4000-8000-0000000260c1','00000000-0000-4000-8000-0000000260f1','00000000-0000-4000-8000-0000000260b1',10,20,1,30,'cod','placed',now(),now()-interval '5 seconds',NULL,NULL,0),
 ('00000000-0000-4000-8000-000000026002','00000000-0000-4000-8000-0000000260c1','00000000-0000-4000-8000-0000000260f1','00000000-0000-4000-8000-0000000260b1',10,20,1,30,'cod','placed',now(),NULL,NULL,NULL,0),
 ('00000000-0000-4000-8000-000000026003','00000000-0000-4000-8000-0000000260c1','00000000-0000-4000-8000-0000000260f1','00000000-0000-4000-8000-0000000260b1',10,20,1,30,'cod','placed',now(),now()-interval '5 minutes',8000,now()-interval '50 seconds',3),
 ('00000000-0000-4000-8000-000000026004','00000000-0000-4000-8000-0000000260c1','00000000-0000-4000-8000-0000000260f1','00000000-0000-4000-8000-0000000260b1',10,20,1,30,'cod','placed',now(),now()-interval '1 minute',NULL,NULL,0);
SET LOCAL session_replication_role=origin;

-- 1. The accept delay holds the search back, then the first ring opens.
DO $$ DECLARE o orders; BEGIN
 PERFORM advance_dispatch_offers(100,NULL);
 IF (SELECT dispatch_broadcast_at FROM orders WHERE id='00000000-0000-4000-8000-000000026001') IS NOT NULL THEN RAISE EXCEPTION 'Searched inside the accept delay'; END IF;
 IF (SELECT dispatch_broadcast_at FROM orders WHERE id='00000000-0000-4000-8000-000000026002') IS NOT NULL THEN RAISE EXCEPTION 'Searched for an order the store has not accepted'; END IF;
 UPDATE orders SET accepted_at=now()-interval '16 seconds' WHERE id='00000000-0000-4000-8000-000000026001';
 PERFORM advance_dispatch_offers(100,NULL);
 SELECT * INTO o FROM orders WHERE id='00000000-0000-4000-8000-000000026001';
 IF o.dispatch_radius_m<>3000 OR o.dispatch_attempts<>1 OR o.status<>'placed' THEN
  RAISE EXCEPTION 'Accepted order not offered in the first ring: % % %',o.dispatch_radius_m,o.dispatch_attempts,o.status; END IF;
 IF (SELECT dispatch_broadcast_at FROM orders WHERE id='00000000-0000-4000-8000-000000026002') IS NOT NULL THEN RAISE EXCEPTION 'Unaccepted order offered'; END IF;
 -- Zero delay: an accepted order is offered on the next pass.
 UPDATE delivery_settings SET dispatch_after_accept_seconds=0;
 UPDATE orders SET accepted_at=now() WHERE id='00000000-0000-4000-8000-000000026002';
 IF NOT EXISTS(SELECT 1 FROM advance_dispatch_offers(100,NULL) a WHERE a.id='00000000-0000-4000-8000-000000026002') THEN RAISE EXCEPTION 'Zero delay did not offer at once'; END IF;
 UPDATE delivery_settings SET dispatch_after_accept_seconds=15;
 -- The packed trigger never restarts a search already running.
 IF EXISTS(SELECT 1 FROM advance_dispatch_offers(1,'00000000-0000-4000-8000-000000026001')) THEN RAISE EXCEPTION 'Packed trigger re-offered a running search'; END IF;
END $$;

-- 2. The widest ring repeats once a minute and counts as "no rider found".
DO $$ DECLARE o orders; BEGIN
 PERFORM advance_dispatch_offers(100,NULL);
 IF (SELECT dispatch_attempts FROM orders WHERE id='00000000-0000-4000-8000-000000026003')<>3 THEN RAISE EXCEPTION 'Widest ring repeated inside a minute'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_dispatch_board(true,50,0) WHERE assign_order_id='00000000-0000-4000-8000-000000026003' AND awaiting_rider) THEN
  RAISE EXCEPTION 'Exhausted accepted order missing from out-of-offers board'; END IF;
 UPDATE orders SET dispatch_broadcast_at=now()-interval '61 seconds' WHERE id='00000000-0000-4000-8000-000000026003';
 PERFORM advance_dispatch_offers(100,NULL);
 SELECT * INTO o FROM orders WHERE id='00000000-0000-4000-8000-000000026003';
 IF o.dispatch_attempts<>4 OR o.dispatch_radius_m<>8000 OR o.dispatch_broadcast_at<now()-interval '5 seconds' THEN
  RAISE EXCEPTION 'Widest ring not repeated: % %',o.dispatch_attempts,o.dispatch_radius_m; END IF;
 -- Just re-offered, but still out of offers: the repeat must not hide it.
 IF NOT EXISTS(SELECT 1 FROM admin_dispatch_board(true,50,0) WHERE assign_order_id='00000000-0000-4000-8000-000000026003') THEN
  RAISE EXCEPTION 'Repeat hid the order from the out-of-offers board'; END IF;
 IF (admin_attention_counts()->>'noRiderFound')::integer<1 THEN RAISE EXCEPTION 'Bell does not count orders with no rider found'; END IF;
 IF EXISTS(SELECT 1 FROM admin_dispatch_board(true,50,0) WHERE assign_order_id='00000000-0000-4000-8000-000000026001') THEN
  RAISE EXCEPTION 'First-ring order marked out of offers'; END IF;
END $$;

-- 3. A rider sees and accepts an accepted (still packing) order; pickup waits.
DO $$ DECLARE r jsonb; BEGIN
 IF NOT EXISTS(SELECT 1 FROM rider_dispatch_offers('00000000-0000-4000-8000-0000000260e1') WHERE order_id='00000000-0000-4000-8000-000000026001') THEN
  RAISE EXCEPTION 'Nearby rider does not see the accepted order'; END IF;
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000026001','00000000-0000-4000-8000-0000000260e1');
 IF r->>'accepted'<>'true' THEN RAISE EXCEPTION 'Early accept refused: %',r; END IF;
 IF (SELECT rider_id FROM orders WHERE id='00000000-0000-4000-8000-000000026001')<>'00000000-0000-4000-8000-0000000260e1'
 OR (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000026001')<>'placed' THEN RAISE EXCEPTION 'Early accept changed status or rider'; END IF;
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000026001','00000000-0000-4000-8000-0000000260e2');
 IF r->>'error'<>'ALREADY_TAKEN' THEN RAISE EXCEPTION 'Second rider took an accepted order: %',r; END IF;
 IF EXISTS(SELECT 1 FROM advance_dispatch_offers(100,NULL) a WHERE a.id='00000000-0000-4000-8000-000000026001') THEN RAISE EXCEPTION 'Assigned order re-offered'; END IF;
 -- An order the store has not accepted can never be taken.
 UPDATE orders SET accepted_at=NULL,dispatch_broadcast_at=now() WHERE id='00000000-0000-4000-8000-000000026002';
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000026002','00000000-0000-4000-8000-0000000260e2');
 IF r->>'accepted'='true' THEN RAISE EXCEPTION 'Unaccepted order taken'; END IF;
END $$;

-- 4. A founder can assign an accepted single order before it is packed.
DO $$ DECLARE n integer; BEGIN
 SELECT count(*) INTO n FROM admin_assign_order_rider('00000000-0000-4000-8000-000000026004','00000000-0000-4000-8000-0000000260e2','ops@example.com');
 IF n<>1 OR (SELECT rider_id FROM orders WHERE id='00000000-0000-4000-8000-000000026004')<>'00000000-0000-4000-8000-0000000260e2' THEN
  RAISE EXCEPTION 'Admin could not assign an accepted order'; END IF;
 SELECT count(*) INTO n FROM admin_assign_order_rider('00000000-0000-4000-8000-000000026002','00000000-0000-4000-8000-0000000260e2','ops@example.com');
 IF n<>0 THEN RAISE EXCEPTION 'Admin assigned an order the store has not accepted'; END IF;
END $$;
ROLLBACK;
