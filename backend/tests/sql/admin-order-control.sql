\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ DECLARE f text; BEGIN
 FOREACH f IN ARRAY ARRAY['admin_assign_order_rider(uuid,uuid,text)'] LOOP
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
 ('00000000-0000-4000-8000-000000009e04','+919999980007','rider',false);
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
-- Single orders 91xx: 01 packed (assign), 02 placed (refused assign).
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,provider_payment_id,status)
 VALUES
 ('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009c01','00000000-0000-4000-8000-000000009f01','00000000-0000-4000-8000-000000009b01',10,20,1,30,'cod',null,'packed'),
 ('00000000-0000-4000-8000-000000009102','00000000-0000-4000-8000-000000009c01','00000000-0000-4000-8000-000000009f01','00000000-0000-4000-8000-000000009b01',10,20,1,30,'cod',null,'placed');
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

ROLLBACK;
SELECT 'Admin order control: trip-aware assignment and audit verified' AS result;
