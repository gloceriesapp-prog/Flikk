\set ON_ERROR_STOP on
-- Migration 20261105150000: a drink sold both chilled and at room temperature
-- needs one per order line; one offered is applied; others take none.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000180a0','Serving zone','serving-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000180c1','+919999180001','customer',true),
 ('00000000-0000-4000-8000-0000000180d1','+919999180002','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000180f1','00000000-0000-4000-8000-0000000180d1','00000000-0000-4000-8000-0000000180a0','Serving shop','grocery','Test',12.97,77.59);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000180b1','00000000-0000-4000-8000-0000000180c1','1 Serving Road','00000000-0000-4000-8000-0000000180a0');
INSERT INTO products(id,store_id,name,unit,price,category,approval_status,is_in_stock,stock_status,stock_tracking_enabled,stock_quantity,serving_options) VALUES
 ('00000000-0000-4000-8000-000000018011','00000000-0000-4000-8000-0000000180f1','Cola','750 ml',40,'Soft Drinks','approved',true,'in_stock',true,50,'{chilled,room_temperature}'),
 ('00000000-0000-4000-8000-000000018012','00000000-0000-4000-8000-0000000180f1','Soda','300 ml',10,'Soft Drinks','approved',true,'in_stock',true,50,'{chilled}'),
 ('00000000-0000-4000-8000-000000018013','00000000-0000-4000-8000-0000000180f1','Atta','1 kg',50,'Atta','approved',true,'in_stock',true,50,'{}');
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,handling_fee,discount_amount,total,payment_method,status,placed_at) VALUES
 ('00000000-0000-4000-8000-000000018041','00000000-0000-4000-8000-0000000180c1','00000000-0000-4000-8000-0000000180f1','00000000-0000-4000-8000-0000000180b1',100,30,0,0,0,130,'cod','placed','2001-04-01 10:00+05:30');
SET LOCAL session_replication_role=origin;

DO $$ BEGIN
 BEGIN
  UPDATE products SET serving_options='{chilled,chilled}' WHERE id='00000000-0000-4000-8000-000000018012';
  RAISE EXCEPTION 'Repeated serving accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE products SET serving_options='{frozen}' WHERE id='00000000-0000-4000-8000-000000018012';
  RAISE EXCEPTION 'Unknown serving accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO order_items(order_id,product_id,quantity,unit_price_at_order)
  VALUES('00000000-0000-4000-8000-000000018041','00000000-0000-4000-8000-000000018011',1,40);
  RAISE EXCEPTION 'Both offered, none picked, accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN
  INSERT INTO order_items(order_id,product_id,quantity,unit_price_at_order,serving)
  VALUES('00000000-0000-4000-8000-000000018041','00000000-0000-4000-8000-000000018012',1,10,'room_temperature');
  RAISE EXCEPTION 'Serving not offered accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN
  INSERT INTO order_items(order_id,product_id,quantity,unit_price_at_order,serving)
  VALUES('00000000-0000-4000-8000-000000018041','00000000-0000-4000-8000-000000018013',1,50,'chilled');
  RAISE EXCEPTION 'Serving on a non-drink accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
INSERT INTO order_items(order_id,product_id,quantity,unit_price_at_order,serving) VALUES
 ('00000000-0000-4000-8000-000000018041','00000000-0000-4000-8000-000000018011',1,40,'room_temperature');
INSERT INTO order_items(order_id,product_id,quantity,unit_price_at_order) VALUES
 ('00000000-0000-4000-8000-000000018041','00000000-0000-4000-8000-000000018012',2,10),
 ('00000000-0000-4000-8000-000000018041','00000000-0000-4000-8000-000000018013',1,50);
DO $$ BEGIN
 IF (SELECT serving FROM order_items WHERE product_id='00000000-0000-4000-8000-000000018011')<>'room_temperature' THEN RAISE EXCEPTION 'Picked serving not kept'; END IF;
 IF (SELECT serving FROM order_items WHERE product_id='00000000-0000-4000-8000-000000018012')<>'chilled' THEN RAISE EXCEPTION 'Only serving not applied'; END IF;
 IF (SELECT serving FROM order_items WHERE product_id='00000000-0000-4000-8000-000000018013') IS NOT NULL THEN RAISE EXCEPTION 'Non-drink got a serving'; END IF;
END $$;
ROLLBACK;
