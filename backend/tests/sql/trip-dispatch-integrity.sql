\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','accept_dispatch_offer(uuid,uuid)','EXECUTE') OR has_function_privilege('authenticated','accept_dispatch_offer(uuid,uuid)','EXECUTE')
 OR has_function_privilege('anon','rider_dispatch_offers(uuid)','EXECUTE') OR has_function_privilege('authenticated','rider_dispatch_offers(uuid)','EXECUTE')
 OR has_function_privilege('anon','assign_trip_rider(uuid,uuid)','EXECUTE') OR has_function_privilege('authenticated','assign_trip_rider(uuid,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','fail_assigned_trip(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Dispatch RPC exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','accept_dispatch_offer(uuid,uuid)','EXECUTE') OR NOT has_function_privilege('service_role','rider_dispatch_offers(uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role','assign_trip_rider(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'API cannot dispatch'; END IF;
END $$;

-- Fixture rows bypass checkout triggers; every assertion below runs with them on.
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000007a0','Dispatch zone','dispatch-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000007c1','+919999970001','customer',true),
 ('00000000-0000-4000-8000-0000000007d1','+919999970002','store_owner',true),
 ('00000000-0000-4000-8000-0000000007d2','+919999970003','store_owner',true),
 ('00000000-0000-4000-8000-0000000007e1','+919999970004','rider',true),
 ('00000000-0000-4000-8000-0000000007e2','+919999970005','rider',true),
 ('00000000-0000-4000-8000-0000000007e3','+919999970006','rider',true),
 ('00000000-0000-4000-8000-0000000007e4','+919999970007','rider',true);
-- e1/e2 online near both shops, e3 online ~50 km away, e4 nearby but offline.
INSERT INTO riders(user_id,name,phone,status,current_lat,current_lng,last_location_update) VALUES
 ('00000000-0000-4000-8000-0000000007e1','Near one','+919999970004','online',12.9716,77.5946,now()),
 ('00000000-0000-4000-8000-0000000007e2','Near two','+919999970005','online',12.9720,77.5950,now()),
 ('00000000-0000-4000-8000-0000000007e3','Far','+919999970006','online',13.4000,77.6000,now()),
 ('00000000-0000-4000-8000-0000000007e4','Offline','+919999970007','offline',12.9716,77.5946,now());
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000007f1','00000000-0000-4000-8000-0000000007d1','00000000-0000-4000-8000-0000000007a0','Shop one','grocery','Test',12.9750,77.5980),
 ('00000000-0000-4000-8000-0000000007f2','00000000-0000-4000-8000-0000000007d2','00000000-0000-4000-8000-0000000007a0','Shop two','grocery','Test',12.9800,77.6000);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000007b1','00000000-0000-4000-8000-0000000007c1','1 Test Road','00000000-0000-4000-8000-0000000007a0');
INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total,provider_payment_id)
 SELECT ('00000000-0000-4000-8000-00000000071'||n)::uuid,'00000000-0000-4000-8000-0000000007c1','00000000-0000-4000-8000-0000000007b1',40,20,60,'pay_dispatch_'||n
 FROM generate_series(1,5) n;
-- Leg ids: 0000072<trip><shop>. Trip 4 is a pre-107 stuck trip: leg one
-- picked up while leg two was never packed or assigned.
INSERT INTO orders(id,trip_id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,provider_payment_id,status,rider_id,dispatch_broadcast_at,dispatch_radius_m)
 SELECT ('00000000-0000-4000-8000-0000000072'||t||s)::uuid,('00000000-0000-4000-8000-00000000071'||t)::uuid,'00000000-0000-4000-8000-0000000007c1',
  ('00000000-0000-4000-8000-0000000007f'||s)::uuid,'00000000-0000-4000-8000-0000000007b1',10,20,1,30,'online','pay_dispatch_'||t,
  CASE WHEN t=2 AND s=2 THEN 'placed' WHEN t=4 AND s=1 THEN 'out_for_delivery' WHEN t=4 AND s=2 THEN 'placed' ELSE 'packed' END,
  CASE WHEN t=4 AND s=1 THEN '00000000-0000-4000-8000-0000000007e1'::uuid END,
  CASE WHEN t=5 THEN null ELSE now() END,3000
 FROM generate_series(1,5) t,generate_series(1,2) s;
INSERT INTO delivery_codes(scope_id,customer_id,code,expires_at) VALUES('00000000-0000-4000-8000-000000000714','00000000-0000-4000-8000-0000000007c1','4321',now()+interval '1 hour');
SET LOCAL session_replication_role=origin;

-- Finding 1: offers come from the stored position and each order's own radius.
DO $$ DECLARE r jsonb; BEGIN
 IF (SELECT count(*) FROM rider_dispatch_offers('00000000-0000-4000-8000-0000000007e1') o JOIN orders x ON x.id=o.order_id
  WHERE x.customer_id='00000000-0000-4000-8000-0000000007c1')<>5 THEN
  RAISE EXCEPTION 'Nearby online rider misses broadcast offers'; END IF;
 IF EXISTS(SELECT 1 FROM rider_dispatch_offers('00000000-0000-4000-8000-0000000007e1') o WHERE o.order_id IN('00000000-0000-4000-8000-000000007251','00000000-0000-4000-8000-000000007252','00000000-0000-4000-8000-000000007222')) THEN
  RAISE EXCEPTION 'Unbroadcast or unpacked order offered'; END IF;
 IF EXISTS(SELECT 1 FROM rider_dispatch_offers('00000000-0000-4000-8000-0000000007e3')) THEN RAISE EXCEPTION 'Far rider sees offers outside dispatch radius'; END IF;
 IF EXISTS(SELECT 1 FROM rider_dispatch_offers('00000000-0000-4000-8000-0000000007e4')) THEN RAISE EXCEPTION 'Offline rider sees offers'; END IF;
 UPDATE riders SET last_location_update=now()-interval '10 minutes' WHERE user_id='00000000-0000-4000-8000-0000000007e2';
 IF EXISTS(SELECT 1 FROM rider_dispatch_offers('00000000-0000-4000-8000-0000000007e2')) THEN RAISE EXCEPTION 'Stale position sees offers'; END IF;
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000007211','00000000-0000-4000-8000-0000000007e2');
 IF r->>'error'<>'RIDER_OFFLINE' THEN RAISE EXCEPTION 'Stale rider accepted: %',r; END IF;
 UPDATE riders SET last_location_update=now() WHERE user_id='00000000-0000-4000-8000-0000000007e2';
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000007211','00000000-0000-4000-8000-0000000007e3');
 IF r->>'error'<>'NOT_OFFERED' THEN RAISE EXCEPTION 'Far rider accepted: %',r; END IF;
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000007211','00000000-0000-4000-8000-0000000007e4');
 IF r->>'error'<>'RIDER_OFFLINE' THEN RAISE EXCEPTION 'Offline rider accepted: %',r; END IF;
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000007251','00000000-0000-4000-8000-0000000007e1');
 IF r->>'error'<>'NOT_OFFERED' THEN RAISE EXCEPTION 'Unbroadcast order accepted: %',r; END IF;
 -- Even the widest dispatch step (8 km) does not reach a rider ~48 km away.
 UPDATE orders SET dispatch_radius_m=8000 WHERE id='00000000-0000-4000-8000-000000007211';
 IF (accept_dispatch_offer('00000000-0000-4000-8000-000000007211','00000000-0000-4000-8000-0000000007e3'))->>'error'<>'NOT_OFFERED' THEN RAISE EXCEPTION 'Radius ignored'; END IF;
 IF EXISTS(SELECT 1 FROM orders WHERE customer_id='00000000-0000-4000-8000-0000000007c1' AND rider_id IS NOT NULL AND id<>'00000000-0000-4000-8000-000000007241') THEN RAISE EXCEPTION 'Refused accept assigned a rider'; END IF;
END $$;

-- Finding 3: one accept claims the whole trip; nobody else can take a leg.
DO $$ DECLARE r jsonb; BEGIN
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000007211','00000000-0000-4000-8000-0000000007e1');
 IF NOT (r->>'accepted')::boolean OR (r->>'replayed')::boolean THEN RAISE EXCEPTION 'Valid accept refused: %',r; END IF;
 IF EXISTS(SELECT 1 FROM orders WHERE trip_id='00000000-0000-4000-8000-000000000711' AND rider_id IS DISTINCT FROM '00000000-0000-4000-8000-0000000007e1') THEN
  RAISE EXCEPTION 'Sibling leg not claimed with the accept'; END IF;
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000007212','00000000-0000-4000-8000-0000000007e2');
 IF r->>'error'<>'ALREADY_TAKEN' THEN RAISE EXCEPTION 'Second rider took a sibling leg: %',r; END IF;
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000007212','00000000-0000-4000-8000-0000000007e1');
 IF NOT (r->>'replayed')::boolean THEN RAISE EXCEPTION 'Winner retry not idempotent: %',r; END IF;
 IF EXISTS(SELECT 1 FROM rider_dispatch_offers('00000000-0000-4000-8000-0000000007e2') o WHERE o.order_id IN('00000000-0000-4000-8000-000000007211','00000000-0000-4000-8000-000000007212')) THEN
  RAISE EXCEPTION 'Claimed trip still offered'; END IF;
 BEGIN PERFORM assign_trip_rider('00000000-0000-4000-8000-000000000711','00000000-0000-4000-8000-0000000007e2'); RAISE EXCEPTION 'Admin split a claimed trip';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 -- Admin assignment of an open trip takes every live leg, then blocks others.
 IF (SELECT count(*) FROM assign_trip_rider('00000000-0000-4000-8000-000000000713','00000000-0000-4000-8000-0000000007e2'))<>2 THEN RAISE EXCEPTION 'Admin trip assignment incomplete'; END IF;
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000007231','00000000-0000-4000-8000-0000000007e1');
 IF r->>'error'<>'ALREADY_TAKEN' THEN RAISE EXCEPTION 'Rider took an admin-assigned trip: %',r; END IF;
 -- An accepted packed leg also claims its still-placed sibling.
 r:=accept_dispatch_offer('00000000-0000-4000-8000-000000007221','00000000-0000-4000-8000-0000000007e1');
 IF NOT (r->>'accepted')::boolean OR (SELECT rider_id FROM orders WHERE id='00000000-0000-4000-8000-000000007222') IS DISTINCT FROM '00000000-0000-4000-8000-0000000007e1' THEN
  RAISE EXCEPTION 'Placed sibling left open for another rider'; END IF;
END $$;

-- Finding 2: no pickup while a sibling is unpacked; picked-up trips can still be failed.
DO $$ DECLARE c text; r jsonb; BEGIN
 BEGIN UPDATE orders SET status='out_for_delivery' WHERE id='00000000-0000-4000-8000-000000007221'; RAISE EXCEPTION 'Picked up beside an unpacked shop';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 UPDATE orders SET status='packed' WHERE id='00000000-0000-4000-8000-000000007222';
 UPDATE orders SET status='out_for_delivery' WHERE id='00000000-0000-4000-8000-000000007221';
 UPDATE orders SET status='out_for_delivery' WHERE id='00000000-0000-4000-8000-000000007222';
 SELECT code INTO c FROM delivery_codes WHERE scope_id='00000000-0000-4000-8000-000000000712';
 r:=complete_verified_delivery('00000000-0000-4000-8000-000000007221','00000000-0000-4000-8000-0000000007e1',c);
 IF NOT (r->>'accepted')::boolean OR (r->>'replayed')::boolean THEN RAISE EXCEPTION 'Trip delivery failed: %',r; END IF;
 r:=complete_verified_delivery('00000000-0000-4000-8000-000000007222','00000000-0000-4000-8000-0000000007e1',c);
 IF NOT (r->>'replayed')::boolean THEN RAISE EXCEPTION 'Sibling delivery not marked as replay: %',r; END IF;
 IF (SELECT status FROM trips WHERE id='00000000-0000-4000-8000-000000000712')<>'delivered'
 OR (SELECT count(*) FROM rider_earnings WHERE trip_id='00000000-0000-4000-8000-000000000712')<>1 THEN RAISE EXCEPTION 'Delivered trip not finalized'; END IF;

 -- Leg one picked up, leg two packed but never collected (shop closed).
 BEGIN PERFORM fail_assigned_trip('00000000-0000-4000-8000-000000000711','00000000-0000-4000-8000-0000000007e1','Shop closed'); RAISE EXCEPTION 'Failed a trip before pickup';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Trip is not ready for a delivery failure' THEN RAISE; END IF; END;
 UPDATE orders SET status='out_for_delivery' WHERE id='00000000-0000-4000-8000-000000007211';
 IF (SELECT cancel_customer_trip('00000000-0000-4000-8000-000000000711','00000000-0000-4000-8000-0000000007c1','Shop closed'))->>'outcome'<>'blocked' THEN RAISE EXCEPTION 'Picked-up trip cancelled'; END IF;
 BEGIN PERFORM fail_assigned_trip('00000000-0000-4000-8000-000000000711','00000000-0000-4000-8000-0000000007e2','Shop closed'); RAISE EXCEPTION 'Other rider failed the trip';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Trip is not ready for a delivery failure' THEN RAISE; END IF; END;
 r:=fail_assigned_trip('00000000-0000-4000-8000-000000000711','00000000-0000-4000-8000-0000000007e1','Shop closed');
 IF (r->>'cancelled_legs')::int<>1 OR NOT (r->>'refund_review_required')::boolean THEN RAISE EXCEPTION 'Unexpected failure result: %',r; END IF;
 IF (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000007211')<>'failed' OR (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000007212')<>'cancelled'
 OR (SELECT status FROM trips WHERE id='00000000-0000-4000-8000-000000000711')<>'failed' THEN RAISE EXCEPTION 'Trip not resolved'; END IF;
 IF (SELECT count(*) FROM rider_earnings WHERE trip_id='00000000-0000-4000-8000-000000000711')<>1 THEN RAISE EXCEPTION 'Failed trip earning missing'; END IF;
 PERFORM approve_failed_trip_refund('00000000-0000-4000-8000-000000000711',6000);
 IF NOT EXISTS(SELECT 1 FROM trip_refunds WHERE trip_id='00000000-0000-4000-8000-000000000711' AND target_paise=6000) THEN RAISE EXCEPTION 'Failed trip refund not queued'; END IF;

 -- A trip already stuck before 107 (picked-up leg beside an unassigned placed leg) is recoverable.
 r:=fail_assigned_trip('00000000-0000-4000-8000-000000000714','00000000-0000-4000-8000-0000000007e1','Shop closed');
 IF (SELECT status FROM trips WHERE id='00000000-0000-4000-8000-000000000714')<>'failed'
 OR (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000007242')<>'cancelled' THEN RAISE EXCEPTION 'Stuck trip not recoverable'; END IF;
END $$;
ROLLBACK;
SELECT 'Dispatch authorization, single-rider trips, pickup ordering and stuck-trip recovery verified' AS result;
