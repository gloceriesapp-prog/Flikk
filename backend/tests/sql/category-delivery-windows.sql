\set ON_ERROR_STOP on
-- Category delivery windows (migration 20261129090000): an item in a slower
-- category pushes its order's (and trip's) promise to the window's max;
-- nothing else may change the recorded promise. Disposable; rolls back.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated flikk_migrations_tests'; END IF; END $$;
BEGIN;
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000129a0','Window zone','window-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000129c1','+919999129001','customer',true),
 ('00000000-0000-4000-8000-0000000129d1','+919999129002','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000129f1','00000000-0000-4000-8000-0000000129d1','00000000-0000-4000-8000-0000000129a0','Window shop','grocery','Test',12.97,77.59);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000129b1','00000000-0000-4000-8000-0000000129c1','1 Window Road','00000000-0000-4000-8000-0000000129a0');
INSERT INTO products(id,store_id,name,category,price,unit) VALUES
 ('00000000-0000-4000-8000-000000012901','00000000-0000-4000-8000-0000000129f1','Chicken curry cut','Non Veg',220,'500 g'),
 ('00000000-0000-4000-8000-000000012902','00000000-0000-4000-8000-0000000129f1','Milk','Milk & Dairy Drinks',30,'500 ml');
INSERT INTO category_delivery_windows(category,min_minutes,max_minutes,note) VALUES('Non Veg',45,60,'cut fresh');
INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total,handling_fee,discount_amount,created_at,estimated_delivery_minutes,estimated_delivery_at) VALUES
 ('00000000-0000-4000-8000-000000012911','00000000-0000-4000-8000-0000000129c1','00000000-0000-4000-8000-0000000129b1',45,250,295,0,0,'2026-01-01 10:00+05:30',35,'2026-01-01 10:35+05:30');
INSERT INTO orders(id,trip_id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,handling_fee,discount_amount,total,payment_method,status,placed_at,estimated_delivery_minutes,estimated_delivery_at) VALUES
 ('00000000-0000-4000-8000-000000012921',null,'00000000-0000-4000-8000-0000000129c1','00000000-0000-4000-8000-0000000129f1','00000000-0000-4000-8000-0000000129b1',30,30,1,0,0,60,'cod','placed','2026-01-01 10:00+05:30',35,'2026-01-01 10:35+05:30'),
 ('00000000-0000-4000-8000-000000012922',null,'00000000-0000-4000-8000-0000000129c1','00000000-0000-4000-8000-0000000129f1','00000000-0000-4000-8000-0000000129b1',220,30,1,0,0,250,'cod','placed','2026-01-01 10:00+05:30',35,'2026-01-01 10:35+05:30'),
 ('00000000-0000-4000-8000-000000012923','00000000-0000-4000-8000-000000012911','00000000-0000-4000-8000-0000000129c1','00000000-0000-4000-8000-0000000129f1','00000000-0000-4000-8000-0000000129b1',30,0,1,0,0,0,'cod','placed','2026-01-01 10:00+05:30',35,'2026-01-01 10:35+05:30'),
 ('00000000-0000-4000-8000-000000012924','00000000-0000-4000-8000-000000012911','00000000-0000-4000-8000-0000000129c1','00000000-0000-4000-8000-0000000129f1','00000000-0000-4000-8000-0000000129b1',220,0,1,0,0,0,'cod','placed','2026-01-01 10:00+05:30',35,'2026-01-01 10:35+05:30');
SET LOCAL session_replication_role=origin;
-- Only the triggers under test run below.
ALTER TABLE order_items DISABLE TRIGGER USER;
ALTER TABLE order_items ENABLE TRIGGER order_items_extend_delivery_estimate;
ALTER TABLE orders DISABLE TRIGGER USER;
ALTER TABLE orders ENABLE TRIGGER orders_snapshot_delivery_estimate;
ALTER TABLE trips DISABLE TRIGGER USER;
ALTER TABLE trips ENABLE TRIGGER trips_snapshot_delivery_estimate;
INSERT INTO order_items(order_id,product_id,quantity,unit_price_at_order) VALUES
 ('00000000-0000-4000-8000-000000012921','00000000-0000-4000-8000-000000012902',1,30),
 ('00000000-0000-4000-8000-000000012922','00000000-0000-4000-8000-000000012902',1,30),
 ('00000000-0000-4000-8000-000000012922','00000000-0000-4000-8000-000000012901',1,220),
 ('00000000-0000-4000-8000-000000012923','00000000-0000-4000-8000-000000012902',1,30),
 ('00000000-0000-4000-8000-000000012924','00000000-0000-4000-8000-000000012901',1,220);
DO $$ BEGIN
 IF (SELECT estimated_delivery_minutes FROM orders WHERE id='00000000-0000-4000-8000-000000012921')<>35 THEN RAISE EXCEPTION 'Milk-only order must keep the normal promise'; END IF;
 IF (SELECT (estimated_delivery_minutes, estimated_delivery_at) FROM orders WHERE id='00000000-0000-4000-8000-000000012922')
    IS DISTINCT FROM (60, '2026-01-01 11:00+05:30'::timestamptz) THEN RAISE EXCEPTION 'Order with meat must promise the window max (60 min)'; END IF;
 IF (SELECT estimated_delivery_minutes FROM trips WHERE id='00000000-0000-4000-8000-000000012911')<>60 THEN RAISE EXCEPTION 'Trip with meat must promise 60 min'; END IF;
 IF EXISTS(SELECT 1 FROM orders WHERE trip_id='00000000-0000-4000-8000-000000012911' AND estimated_delivery_minutes<>60) THEN RAISE EXCEPTION 'Every leg of the trip arrives together: all must say 60 min'; END IF;
 BEGIN UPDATE orders SET estimated_delivery_minutes=90 WHERE id='00000000-0000-4000-8000-000000012921'; RAISE EXCEPTION 'Promise changed outside the item trigger';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%cannot be changed%' THEN RAISE; END IF; END;
 PERFORM set_config('app.extend_delivery_estimate','on',true);
 BEGIN UPDATE orders SET estimated_delivery_minutes=20, estimated_delivery_at='2026-01-01 10:20+05:30' WHERE id='00000000-0000-4000-8000-000000012921'; RAISE EXCEPTION 'Promise lowered';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%cannot be changed%' THEN RAISE; END IF; END;
 PERFORM set_config('app.extend_delivery_estimate','',true);
 BEGIN INSERT INTO category_delivery_windows(category,min_minutes,max_minutes) VALUES('Bad',60,45); RAISE EXCEPTION 'max below min accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF has_table_privilege('anon','public.category_delivery_windows','SELECT') OR has_table_privilege('authenticated','public.category_delivery_windows','SELECT') THEN RAISE EXCEPTION 'Service role only'; END IF;
END $$;
ROLLBACK;
