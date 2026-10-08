\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ DECLARE f text; BEGIN
 FOREACH f IN ARRAY ARRAY['admin_assign_order_rider(uuid,uuid,text)','admin_cancel_order(uuid,text,text)','admin_advance_order_status(uuid,text,text,text)',
  'admin_unassign_rider(uuid,text,text)','admin_reassign_rider(uuid,uuid,text,text)','cancel_trip_from_leg(uuid,text,text)',
  'admin_reissue_delivery_code(uuid,uuid,text)','admin_approve_trip_failure_refund(uuid,bigint,text)',
  'cancel_unanswered_store_orders(integer)'] LOOP
  IF has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE') THEN RAISE EXCEPTION '% exposed to API roles',f; END IF;
  IF NOT has_function_privilege('service_role',f,'EXECUTE') THEN RAISE EXCEPTION 'service_role cannot run %',f; END IF;
 END LOOP;
 IF has_table_privilege('authenticated','admin_order_actions','SELECT') OR has_table_privilege('service_role','admin_order_actions','INSERT') THEN RAISE EXCEPTION 'Audit table writable or exposed'; END IF;
END $$;

-- Fixture rows bypass checkout triggers; every assertion below runs with them on.
-- Ids: c=customer d=owner e=rider f=store a=product 1x=single order 0x=trip 3xy=trip leg.
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-000000009a00','Admin zone','admin-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-000000009c01','+919999980001','customer',true),
 ('00000000-0000-4000-8000-000000009d01','+919999980002','store_owner',true),
 ('00000000-0000-4000-8000-000000009d02','+919999980003','store_owner',true),
 ('00000000-0000-4000-8000-000000009e01','+919999980004','rider',true),
 ('00000000-0000-4000-8000-000000009e02','+919999980005','rider',true),
 ('00000000-0000-4000-8000-000000009e03','+919999980006','rider',true),
 ('00000000-0000-4000-8000-000000009e04','+919999980007','rider',false),
 ('00000000-0000-4000-8000-000000009ad1','+919999980010','admin',true);
INSERT INTO riders(user_id,name,phone,status,is_active,current_lat,current_lng,last_location_update) VALUES
 ('00000000-0000-4000-8000-000000009e01','Rider one','+919999980004','online',true,12.97,77.59,now()),
 ('00000000-0000-4000-8000-000000009e02','Rider two','+919999980005','online',true,12.97,77.59,now()),
 ('00000000-0000-4000-8000-000000009e03','Inactive','+919999980006','online',false,12.97,77.59,now()),
 ('00000000-0000-4000-8000-000000009e04','Unapproved','+919999980007','online',true,12.97,77.59,now());
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,phone,lat,lng) VALUES
 ('00000000-0000-4000-8000-000000009f01','00000000-0000-4000-8000-000000009d01','00000000-0000-4000-8000-000000009a00','Admin shop one','grocery','Test','+919999980008',12.975,77.598),
 ('00000000-0000-4000-8000-000000009f02','00000000-0000-4000-8000-000000009d02','00000000-0000-4000-8000-000000009a00','Admin shop two','grocery','Test','+919999980009',12.980,77.600);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-000000009b01','00000000-0000-4000-8000-000000009c01','9 Admin Road','00000000-0000-4000-8000-000000009a00');
INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total,provider_payment_id)
 SELECT ('00000000-0000-4000-8000-0000000090'||lpad(n::text,2,'0'))::uuid,'00000000-0000-4000-8000-000000009c01','00000000-0000-4000-8000-000000009b01',40,20,60,'pay_admin_trip_'||n
 FROM generate_series(1,6) n;
-- Trip legs 3<trip><shop>: both legs packed unless listed.
INSERT INTO orders(id,trip_id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,provider_payment_id,status)
 SELECT ('00000000-0000-4000-8000-0000000093'||t||s)::uuid,('00000000-0000-4000-8000-0000000090'||lpad(t::text,2,'0'))::uuid,'00000000-0000-4000-8000-000000009c01',
  ('00000000-0000-4000-8000-000000009f0'||s)::uuid,'00000000-0000-4000-8000-000000009b01',10,20,1,30,'online','pay_admin_trip_'||t,'packed'
 FROM generate_series(1,6) t,generate_series(1,2) s;
-- Trip 3: leg 31 already picked up by rider one. Trips 4/5: both legs with rider one.
-- Trip 5: leg 51 not packed yet.
UPDATE orders SET rider_id='00000000-0000-4000-8000-000000009e01' WHERE trip_id IN('00000000-0000-4000-8000-000000009003','00000000-0000-4000-8000-000000009004','00000000-0000-4000-8000-000000009005');
UPDATE orders SET status='out_for_delivery' WHERE id='00000000-0000-4000-8000-000000009331';
UPDATE orders SET status='placed' WHERE id='00000000-0000-4000-8000-000000009351';
-- Single orders 91xx: 01 packed (assign), 02 placed (refused assign), 03 placed COD
-- holding 2 units of stock, 04 packed with rider one, 05 picked up, 06 unpaid
-- online checkout, 07 paid online packed.
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,provider_payment_id,status,rider_id)
 SELECT ('00000000-0000-4000-8000-0000000091'||n)::uuid,'00000000-0000-4000-8000-000000009c01','00000000-0000-4000-8000-000000009f01','00000000-0000-4000-8000-000000009b01',10,20,1,30,
  CASE WHEN n IN('06','07') THEN 'online' ELSE 'cod' END,CASE WHEN n='07' THEN 'pay_admin_single_07' END,
  CASE n WHEN '01' THEN 'packed' WHEN '04' THEN 'packed' WHEN '05' THEN 'out_for_delivery' WHEN '07' THEN 'packed' ELSE 'placed' END,
  CASE WHEN n IN('04','05') THEN '00000000-0000-4000-8000-000000009e01'::uuid END
 FROM unnest(ARRAY['01','02','03','04','05','06','07']) n;
INSERT INTO products(id,store_id,name,unit,price,category,stock_tracking_enabled,stock_quantity)
 VALUES('00000000-0000-4000-8000-000000009a01','00000000-0000-4000-8000-000000009f01','Admin rice','kg',50,'grocery',true,5);
INSERT INTO order_items(id,order_id,product_id,quantity,unit_price_at_order)
 VALUES('00000000-0000-4000-8000-000000009a11','00000000-0000-4000-8000-000000009103','00000000-0000-4000-8000-000000009a01',2,5);
INSERT INTO inventory_reservations(order_item_id,order_id,product_id,quantity,state)
 VALUES('00000000-0000-4000-8000-000000009a11','00000000-0000-4000-8000-000000009103','00000000-0000-4000-8000-000000009a01',2,'committed');
SET LOCAL session_replication_role=origin;

-- B1: manual assignment is trip-aware, audited, and refuses unsafe riders.
DO $$ DECLARE n integer; BEGIN
 BEGIN PERFORM admin_assign_order_rider('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009e03','admin@test.dev'); RAISE EXCEPTION 'Inactive rider assigned';
 EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_assign_order_rider('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009e04','admin@test.dev'); RAISE EXCEPTION 'Unapproved rider assigned';
 EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_assign_order_rider('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009e01',''); RAISE EXCEPTION 'Assigned without an admin identity';
 EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 SELECT count(*) INTO n FROM admin_assign_order_rider('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009e01','Admin@Test.dev');
 IF n<>1 OR (SELECT rider_id FROM orders WHERE id='00000000-0000-4000-8000-000000009101') IS DISTINCT FROM '00000000-0000-4000-8000-000000009e01' THEN RAISE EXCEPTION 'Single order not assigned'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_order_actions WHERE order_id='00000000-0000-4000-8000-000000009101' AND action='assign_rider'
  AND to_value='00000000-0000-4000-8000-000000009e01' AND admin_email='admin@test.dev' AND trip_id IS NULL) THEN RAISE EXCEPTION 'Assignment not audited'; END IF;
 -- Guarded single path: never steals an assigned order, never assigns an unpacked one.
 SELECT count(*) INTO n FROM admin_assign_order_rider('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009e02','admin@test.dev');
 IF n<>0 OR (SELECT count(*) FROM admin_order_actions WHERE order_id='00000000-0000-4000-8000-000000009101')<>1 THEN RAISE EXCEPTION 'Assigned order stolen or no-op audited'; END IF;
 SELECT count(*) INTO n FROM admin_assign_order_rider('00000000-0000-4000-8000-000000009102','00000000-0000-4000-8000-000000009e02','admin@test.dev');
 IF n<>0 THEN RAISE EXCEPTION 'Unpacked single order assigned'; END IF;
 -- A trip leg assigns every live leg of the trip to the same rider (assign_trip_rider).
 SELECT count(*) INTO n FROM admin_assign_order_rider('00000000-0000-4000-8000-000000009311','00000000-0000-4000-8000-000000009e01','admin@test.dev');
 IF n<>2 OR EXISTS(SELECT 1 FROM orders WHERE trip_id='00000000-0000-4000-8000-000000009001' AND rider_id IS DISTINCT FROM '00000000-0000-4000-8000-000000009e01') THEN RAISE EXCEPTION 'Trip not assigned as a whole'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_order_actions WHERE trip_id='00000000-0000-4000-8000-000000009001' AND action='assign_rider') THEN RAISE EXCEPTION 'Trip assignment not audited'; END IF;
 BEGIN PERFORM admin_assign_order_rider('00000000-0000-4000-8000-000000009312','00000000-0000-4000-8000-000000009e02','admin@test.dev'); RAISE EXCEPTION 'Trip split across riders';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
END $$;

-- B2: cancel uses the safe path — stock released, refunds queued, trips cancelled whole.
DO $$ DECLARE r jsonb; BEGIN
 BEGIN PERFORM admin_cancel_order('00000000-0000-4000-8000-000000009103','x','admin@test.dev'); RAISE EXCEPTION 'Cancelled without a reason';
 EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 r:=admin_cancel_order('00000000-0000-4000-8000-000000009103','Customer called to cancel','admin@test.dev');
 IF (SELECT status||'/'||cancel_reason||'/'||cancelled_by FROM orders WHERE id='00000000-0000-4000-8000-000000009103')<>'cancelled/Customer called to cancel/admin' THEN RAISE EXCEPTION 'Single order not cancelled'; END IF;
 IF (SELECT stock_quantity FROM products WHERE id='00000000-0000-4000-8000-000000009a01')<>7
 OR (SELECT state FROM inventory_reservations WHERE order_item_id='00000000-0000-4000-8000-000000009a11')<>'released' THEN RAISE EXCEPTION 'Cancel did not release stock'; END IF;
 IF NOT EXISTS(SELECT 1 FROM customer_notifications WHERE order_id='00000000-0000-4000-8000-000000009103' AND event='cancelled') THEN RAISE EXCEPTION 'Customer not notified'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_order_actions WHERE order_id='00000000-0000-4000-8000-000000009103' AND action='cancel' AND from_value='placed' AND to_value='cancelled' AND reason='Customer called to cancel') THEN RAISE EXCEPTION 'Cancel not audited'; END IF;
 BEGIN PERFORM admin_cancel_order('00000000-0000-4000-8000-000000009103','Again please','admin@test.dev'); RAISE EXCEPTION 'Cancelled twice';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 BEGIN PERFORM admin_cancel_order('00000000-0000-4000-8000-000000009105','After pickup','admin@test.dev'); RAISE EXCEPTION 'Cancelled after pickup';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 -- Paid single order: the refund intent is queued in the same transaction.
 PERFORM admin_cancel_order('00000000-0000-4000-8000-000000009107','Shop asked us to cancel','admin@test.dev');
 IF (SELECT refund_status FROM orders WHERE id='00000000-0000-4000-8000-000000009107')<>'processing'
 OR NOT EXISTS(SELECT 1 FROM order_refund_jobs WHERE order_id='00000000-0000-4000-8000-000000009107' AND target_paise=3000) THEN RAISE EXCEPTION 'Paid cancel did not start a refund'; END IF;
 -- Trip leg: every leg and the trip are cancelled, one combined refund, origin recorded.
 r:=admin_cancel_order('00000000-0000-4000-8000-000000009322','Shop two is closed','admin@test.dev');
 IF jsonb_array_length(r->'cancelled_order_ids')<>2 OR EXISTS(SELECT 1 FROM orders WHERE trip_id='00000000-0000-4000-8000-000000009002' AND (status<>'cancelled' OR cancelled_by<>'admin'))
 OR (SELECT status FROM trips WHERE id='00000000-0000-4000-8000-000000009002')<>'cancelled' THEN RAISE EXCEPTION 'Trip not cancelled whole: %',r; END IF;
 IF NOT EXISTS(SELECT 1 FROM trips WHERE id='00000000-0000-4000-8000-000000009002' AND cancelled_by='admin'
  AND cancel_origin_order_id='00000000-0000-4000-8000-000000009322' AND cancel_origin_store_id='00000000-0000-4000-8000-000000009f02') THEN RAISE EXCEPTION 'Trip cancel origin missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM trip_refunds WHERE trip_id='00000000-0000-4000-8000-000000009002' AND target_paise=6000) OR EXISTS(SELECT 1 FROM order_refund_jobs WHERE order_id IN('00000000-0000-4000-8000-000000009321','00000000-0000-4000-8000-000000009322')) THEN
  RAISE EXCEPTION 'Trip refund not combined'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_order_actions WHERE trip_id='00000000-0000-4000-8000-000000009002' AND order_id='00000000-0000-4000-8000-000000009322' AND action='cancel') THEN RAISE EXCEPTION 'Trip cancel not audited'; END IF;
 BEGIN PERFORM admin_cancel_order('00000000-0000-4000-8000-000000009321','Again please','admin@test.dev'); RAISE EXCEPTION 'Trip cancelled twice';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 -- A trip with a picked-up leg cannot be cancelled; nothing changes.
 BEGIN PERFORM admin_cancel_order('00000000-0000-4000-8000-000000009332','Too late','admin@test.dev'); RAISE EXCEPTION 'Picked-up trip cancelled';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 IF (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000009332')<>'packed' THEN RAISE EXCEPTION 'Blocked trip cancel changed a leg'; END IF;
END $$;

-- B2: unassign / reassign are pre-pickup only and keep a trip on one rider.
DO $$ DECLARE r jsonb; BEGIN
 BEGIN PERFORM admin_unassign_rider('00000000-0000-4000-8000-000000009332','Rider is stuck','admin@test.dev'); RAISE EXCEPTION 'Unassigned after pickup';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 BEGIN PERFORM admin_reassign_rider('00000000-0000-4000-8000-000000009105','00000000-0000-4000-8000-000000009e02','Rider is stuck','admin@test.dev'); RAISE EXCEPTION 'Reassigned after pickup';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 UPDATE orders SET dispatch_broadcast_at=now(),dispatch_radius_m=5000 WHERE trip_id='00000000-0000-4000-8000-000000009004';
 r:=admin_unassign_rider('00000000-0000-4000-8000-000000009341','Rider phone is off','admin@test.dev');
 IF jsonb_array_length(r->'order_ids')<>2 OR EXISTS(SELECT 1 FROM orders WHERE trip_id='00000000-0000-4000-8000-000000009004'
  AND (rider_id IS NOT NULL OR dispatch_broadcast_at IS NOT NULL OR dispatch_radius_m IS NOT NULL)) THEN RAISE EXCEPTION 'Trip not fully unassigned: %',r; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_order_actions WHERE trip_id='00000000-0000-4000-8000-000000009004' AND action='unassign_rider' AND from_value='00000000-0000-4000-8000-000000009e01') THEN RAISE EXCEPTION 'Unassign not audited'; END IF;
 BEGIN PERFORM admin_unassign_rider('00000000-0000-4000-8000-000000009341','Twice please','admin@test.dev'); RAISE EXCEPTION 'Unassigned nothing';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 BEGIN PERFORM admin_reassign_rider('00000000-0000-4000-8000-000000009341','00000000-0000-4000-8000-000000009e02','No rider yet','admin@test.dev'); RAISE EXCEPTION 'Reassigned an unassigned order';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 -- Reassign moves every live leg; inactive riders are refused.
 BEGIN PERFORM admin_reassign_rider('00000000-0000-4000-8000-000000009352','00000000-0000-4000-8000-000000009e03','Swap rider','admin@test.dev'); RAISE EXCEPTION 'Reassigned to inactive rider';
 EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 r:=admin_reassign_rider('00000000-0000-4000-8000-000000009352','00000000-0000-4000-8000-000000009e02','Rider one went home','admin@test.dev');
 IF EXISTS(SELECT 1 FROM orders WHERE trip_id='00000000-0000-4000-8000-000000009005' AND rider_id IS DISTINCT FROM '00000000-0000-4000-8000-000000009e02') THEN RAISE EXCEPTION 'Trip split on reassign'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_order_actions WHERE trip_id='00000000-0000-4000-8000-000000009005' AND action='reassign_rider'
  AND from_value='00000000-0000-4000-8000-000000009e01' AND to_value='00000000-0000-4000-8000-000000009e02') THEN RAISE EXCEPTION 'Reassign not audited'; END IF;
 r:=admin_reassign_rider('00000000-0000-4000-8000-000000009104','00000000-0000-4000-8000-000000009e02','Rider one went home','admin@test.dev');
 IF (SELECT rider_id FROM orders WHERE id='00000000-0000-4000-8000-000000009104') IS DISTINCT FROM '00000000-0000-4000-8000-000000009e02' THEN RAISE EXCEPTION 'Single reassign failed'; END IF;
END $$;

-- B2: forward status changes follow the state machine and the checkout guards.
DO $$ BEGIN
 BEGIN PERFORM admin_advance_order_status('00000000-0000-4000-8000-000000009102','delivered','Customer has it','admin@test.dev'); RAISE EXCEPTION 'Skipped states';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 BEGIN PERFORM admin_advance_order_status('00000000-0000-4000-8000-000000009105','delivered','Customer has it','admin@test.dev'); RAISE EXCEPTION 'Admin completed a delivery without the code';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 BEGIN PERFORM admin_advance_order_status('00000000-0000-4000-8000-000000009106','packed','Shop packed it','admin@test.dev'); RAISE EXCEPTION 'Packed an unpaid checkout';
 EXCEPTION WHEN sqlstate 'P1001' THEN NULL; END;
 UPDATE orders SET rider_id=NULL WHERE id='00000000-0000-4000-8000-000000009101';
 BEGIN PERFORM admin_advance_order_status('00000000-0000-4000-8000-000000009101','out_for_delivery','Rider took it','admin@test.dev'); RAISE EXCEPTION 'Picked up without a rider';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 -- Trip 5 (now rider two): leg 52 cannot leave while leg 51 is unpacked.
 BEGIN PERFORM admin_advance_order_status('00000000-0000-4000-8000-000000009352','out_for_delivery','Rider took it','admin@test.dev'); RAISE EXCEPTION 'Trip pickup beside unpacked shop';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 PERFORM admin_advance_order_status('00000000-0000-4000-8000-000000009351','packed','Shop packed but app crashed','admin@test.dev');
 PERFORM admin_advance_order_status('00000000-0000-4000-8000-000000009352','out_for_delivery','Rider app offline','admin@test.dev');
 IF (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000009351')<>'packed' OR (SELECT packed_at FROM orders WHERE id='00000000-0000-4000-8000-000000009351') IS NULL
 OR (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000009352')<>'out_for_delivery' THEN RAISE EXCEPTION 'Forward status not applied'; END IF;
 IF (SELECT count(*) FROM admin_order_actions WHERE trip_id='00000000-0000-4000-8000-000000009005' AND action='advance_status')<>2 THEN RAISE EXCEPTION 'Status changes not audited'; END IF;
END $$;

-- B3: reissue uses reissue_delivery_code, resets attempts, is audited, never returns the code.
DO $$ DECLARE r jsonb; old text; BEGIN
 BEGIN PERFORM admin_reissue_delivery_code('00000000-0000-4000-8000-000000009102','00000000-0000-4000-8000-000000009ad1','admin@test.dev'); RAISE EXCEPTION 'Code issued before pickup';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 UPDATE delivery_codes SET attempts=5 WHERE scope_id='00000000-0000-4000-8000-000000009105';
 SELECT code INTO old FROM delivery_codes WHERE scope_id='00000000-0000-4000-8000-000000009105';
 r:=admin_reissue_delivery_code('00000000-0000-4000-8000-000000009105','00000000-0000-4000-8000-000000009ad1','admin@test.dev');
 IF r ? 'code' OR (r->>'attempts')::int<>0 THEN RAISE EXCEPTION 'Reissue result wrong: %',r; END IF;
 IF NOT EXISTS(SELECT 1 FROM delivery_codes WHERE scope_id='00000000-0000-4000-8000-000000009105' AND attempts=0 AND consumed_at IS NULL AND expires_at>now()+interval '1 hour')
 OR NOT EXISTS(SELECT 1 FROM delivery_code_resets WHERE order_id='00000000-0000-4000-8000-000000009105')
 OR NOT EXISTS(SELECT 1 FROM admin_order_actions WHERE order_id='00000000-0000-4000-8000-000000009105' AND action='reissue_delivery_code') THEN RAISE EXCEPTION 'Code not reissued'; END IF;
 -- Trip scope: one code per trip.
 r:=admin_reissue_delivery_code('00000000-0000-4000-8000-000000009352','00000000-0000-4000-8000-000000009ad1','admin@test.dev');
 IF NOT EXISTS(SELECT 1 FROM delivery_codes WHERE scope_id='00000000-0000-4000-8000-000000009005') THEN RAISE EXCEPTION 'Trip code not reissued'; END IF;
END $$;

-- B4: a failed trip leg is refunded through approve_failed_trip_refund, once, for the whole trip.
DO $$ DECLARE r jsonb; BEGIN
 BEGIN PERFORM admin_approve_trip_failure_refund('00000000-0000-4000-8000-000000009361',6000,'admin@test.dev'); RAISE EXCEPTION 'Refunded a trip that did not fail';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 SET LOCAL session_replication_role=replica;
 UPDATE orders SET status='failed',rider_id='00000000-0000-4000-8000-000000009e01' WHERE trip_id='00000000-0000-4000-8000-000000009006';
 UPDATE trips SET status='failed' WHERE id='00000000-0000-4000-8000-000000009006';
 SET LOCAL session_replication_role=origin;
 BEGIN PERFORM request_order_refund('00000000-0000-4000-8000-000000009361'); RAISE EXCEPTION 'Single-order refund accepted a trip leg';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN PERFORM admin_approve_trip_failure_refund('00000000-0000-4000-8000-000000009361',999999,'admin@test.dev'); RAISE EXCEPTION 'Refund above trip total';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 r:=admin_approve_trip_failure_refund('00000000-0000-4000-8000-000000009362',4500,'admin@test.dev');
 IF r->>'status'<>'queued' OR (r->>'target_paise')::bigint<>4500 THEN RAISE EXCEPTION 'Trip refund not queued: %',r; END IF;
 IF EXISTS(SELECT 1 FROM orders WHERE trip_id='00000000-0000-4000-8000-000000009006' AND refund_status<>'processing') THEN RAISE EXCEPTION 'Legs not marked processing'; END IF;
 BEGIN PERFORM admin_approve_trip_failure_refund('00000000-0000-4000-8000-000000009361',6000,'admin@test.dev'); RAISE EXCEPTION 'Second amount accepted';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 IF (SELECT count(*) FROM trip_refunds WHERE trip_id='00000000-0000-4000-8000-000000009006')<>1
 OR NOT EXISTS(SELECT 1 FROM admin_order_actions WHERE trip_id='00000000-0000-4000-8000-000000009006' AND action='trip_failure_refund' AND to_value='4500') THEN RAISE EXCEPTION 'Trip refund not single or not audited'; END IF;
END $$;

-- B5: the store_no_response job cancels only paid/COD orders still placed past the window.
DO $$ DECLARE r jsonb; BEGIN
 -- Visibility stamps: COD on insert, online only once paid.
 SET LOCAL session_replication_role=replica;
 INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total,provider_payment_id)
  VALUES('00000000-0000-4000-8000-000000009007','00000000-0000-4000-8000-000000009c01','00000000-0000-4000-8000-000000009b01',40,20,60,'pay_admin_trip_7');
 INSERT INTO orders(id,trip_id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,provider_payment_id,status,placed_at,store_visible_at)
  SELECT ('00000000-0000-4000-8000-0000000094'||n)::uuid,CASE WHEN n IN('71','72') THEN '00000000-0000-4000-8000-000000009007'::uuid END,
   '00000000-0000-4000-8000-000000009c01',CASE WHEN n='72' THEN '00000000-0000-4000-8000-000000009f02'::uuid ELSE '00000000-0000-4000-8000-000000009f01'::uuid END,
   '00000000-0000-4000-8000-000000009b01',10,20,1,30,
   CASE WHEN n IN('02','03','71','72') THEN 'online' ELSE 'cod' END,
   CASE WHEN n IN('02','71','72') THEN 'pay_nr_'||n END,
   CASE WHEN n IN('05','72') THEN 'packed' ELSE 'placed' END,
   now()-interval '40 minutes',
   CASE WHEN n='03' THEN NULL WHEN n='04' THEN now()-interval '2 minutes' WHEN n='06' THEN now()-interval '15 minutes' ELSE now()-interval '35 minutes' END
  FROM unnest(ARRAY['01','02','03','04','05','06','71','72']) n;
 SET LOCAL session_replication_role=origin;
 -- 01 COD old, 02 paid old, 03 unpaid checkout, 04 COD fresh, 05 packed old,
 -- 06 COD 15 min, trip 7: leg 71 placed+paid old beside packed leg 72.
 UPDATE delivery_settings SET store_response_timeout_minutes=30;
 r:=cancel_unanswered_store_orders(50);
 IF (SELECT array_agg(id ORDER BY id) FROM orders WHERE id::text LIKE '00000000-0000-4000-8000-0000000094%' AND status='cancelled')
  <>ARRAY['00000000-0000-4000-8000-000000009401','00000000-0000-4000-8000-000000009402','00000000-0000-4000-8000-000000009471','00000000-0000-4000-8000-000000009472']::uuid[] THEN
  RAISE EXCEPTION 'Job picked the wrong orders: %',r; END IF;
 IF (r->>'single_targets')::int<>2 OR (r->>'trip_targets')::int<>1 OR (r->>'cancelled_orders')::int<>4 THEN RAISE EXCEPTION 'Unexpected batch: %',r; END IF;
 IF EXISTS(SELECT 1 FROM orders WHERE id IN('00000000-0000-4000-8000-000000009401','00000000-0000-4000-8000-000000009402','00000000-0000-4000-8000-000000009471','00000000-0000-4000-8000-000000009472')
  AND (cancel_reason<>'store_no_response' OR cancelled_by<>'system')) THEN RAISE EXCEPTION 'Wrong reason/actor'; END IF;
 IF (SELECT refund_status FROM orders WHERE id='00000000-0000-4000-8000-000000009402')<>'processing'
 OR NOT EXISTS(SELECT 1 FROM trip_refunds WHERE trip_id='00000000-0000-4000-8000-000000009007')
 OR NOT EXISTS(SELECT 1 FROM customer_notifications WHERE order_id='00000000-0000-4000-8000-000000009401' AND event='cancelled') THEN RAISE EXCEPTION 'Refund or notification missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM trips WHERE id='00000000-0000-4000-8000-000000009007' AND status='cancelled' AND cancelled_by='system'
  AND cancel_origin_order_id='00000000-0000-4000-8000-000000009471' AND cancel_origin_store_id='00000000-0000-4000-8000-000000009f01') THEN RAISE EXCEPTION 'Trip origin not recorded'; END IF;
 -- A shorter window then picks the 15-minute order; a second pass is a no-op.
 UPDATE delivery_settings SET store_response_timeout_minutes=10;
 r:=cancel_unanswered_store_orders(50);
 IF (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000009406')<>'cancelled' OR (r->>'cancelled_orders')::int<>1 THEN RAISE EXCEPTION 'Setting not applied: %',r; END IF;
 IF (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000009403')<>'placed' OR (SELECT status FROM orders WHERE id='00000000-0000-4000-8000-000000009404')<>'placed' THEN RAISE EXCEPTION 'Ineligible order cancelled'; END IF;
 BEGIN UPDATE delivery_settings SET store_response_timeout_minutes=1; RAISE EXCEPTION 'Timeout bound missing';
 EXCEPTION WHEN check_violation THEN NULL; END;
 -- Visibility stamp: an online order becomes visible when it is paid.
 UPDATE orders SET provider_payment_id='pay_nr_03' WHERE id='00000000-0000-4000-8000-000000009403';
 IF (SELECT store_visible_at FROM orders WHERE id='00000000-0000-4000-8000-000000009403') IS NULL THEN RAISE EXCEPTION 'Payment did not stamp visibility'; END IF;
END $$;

-- B6: a partner reject on one leg cancels the trip and records which store caused it.
DO $$ DECLARE r jsonb; BEGIN
 SET LOCAL session_replication_role=replica;
 INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total)
  VALUES('00000000-0000-4000-8000-000000009008','00000000-0000-4000-8000-000000009c01','00000000-0000-4000-8000-000000009b01',40,20,60);
 INSERT INTO orders(id,trip_id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,status)
  SELECT ('00000000-0000-4000-8000-00000000938'||n)::uuid,'00000000-0000-4000-8000-000000009008','00000000-0000-4000-8000-000000009c01',
   ('00000000-0000-4000-8000-000000009f0'||n)::uuid,'00000000-0000-4000-8000-000000009b01',10,20,1,30,'cod','placed' FROM generate_series(1,2) n;
 SET LOCAL session_replication_role=origin;
 BEGIN PERFORM cancel_trip_from_leg('00000000-0000-4000-8000-000000009382','store_closed','robot'); RAISE EXCEPTION 'Unknown role accepted';
 EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 r:=cancel_trip_from_leg('00000000-0000-4000-8000-000000009382','store_out_of_stock','store_owner');
 IF r->>'outcome'<>'cancelled' OR (r->>'origin_store_id')::uuid<>'00000000-0000-4000-8000-000000009f02' THEN RAISE EXCEPTION 'Unexpected result: %',r; END IF;
 IF NOT EXISTS(SELECT 1 FROM trips WHERE id='00000000-0000-4000-8000-000000009008' AND status='cancelled' AND cancelled_by='store_owner'
  AND cancel_origin_order_id='00000000-0000-4000-8000-000000009382' AND cancel_origin_store_id='00000000-0000-4000-8000-000000009f02')
 OR EXISTS(SELECT 1 FROM orders WHERE trip_id='00000000-0000-4000-8000-000000009008' AND (status<>'cancelled' OR cancel_reason<>'store_out_of_stock' OR cancelled_by<>'store_owner')) THEN
  RAISE EXCEPTION 'Partner reject origin not recorded'; END IF;
 -- Replaying on the cancelled trip keeps the original origin.
 PERFORM cancel_trip_from_leg('00000000-0000-4000-8000-000000009381','other','admin');
 IF (SELECT cancel_origin_order_id FROM trips WHERE id='00000000-0000-4000-8000-000000009008')<>'00000000-0000-4000-8000-000000009382' THEN RAISE EXCEPTION 'Origin overwritten'; END IF;
END $$;

ROLLBACK;
SELECT 'Admin order control: trip-aware assignment, safe cancel, rider changes, forward status, code reissue, trip refunds, store_no_response job, reject origin and audit verified' AS result;
