\set ON_ERROR_STOP on
-- Migration 20261104160000: Gloceries' extra on top of the store price.
-- The customer pays store price + markup (never above MRP), the order line
-- keeps the store price, and the store is paid on store prices only.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF customer_unit_price(300,15,NULL)<>315 OR customer_unit_price(300,15,310)<>310
 OR customer_unit_price(320,15,310)<>320 OR customer_unit_price(300,0,400)<>300 THEN RAISE EXCEPTION 'customer_unit_price rule wrong'; END IF;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000160a0','Markup zone','markup-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000160c1','+919999160001','customer',true),
 ('00000000-0000-4000-8000-0000000160d1','+919999160002','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000160f1','00000000-0000-4000-8000-0000000160d1','00000000-0000-4000-8000-0000000160a0','Markup shop','grocery','Test',12.97,77.59);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000160b1','00000000-0000-4000-8000-0000000160c1','1 Markup Road','00000000-0000-4000-8000-0000000160a0');
INSERT INTO products(id,store_id,name,unit,price,original_price,category,approval_status,is_in_stock,stock_status,stock_tracking_enabled,stock_quantity) VALUES
 ('00000000-0000-4000-8000-000000016011','00000000-0000-4000-8000-0000000160f1','Atta','5 kg',300,310,'Atta','approved',true,'in_stock',true,10),
 ('00000000-0000-4000-8000-000000016012','00000000-0000-4000-8000-0000000160f1','Loose salt','1 kg',20,null,'Salt','approved',true,'in_stock',true,10);
INSERT INTO product_variants(id,product_id,unit_type,quantity,price,original_price,is_default,platform_markup) VALUES
 ('00000000-0000-4000-8000-000000016021','00000000-0000-4000-8000-000000016011','kg',5,300,310,true,15);
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,handling_fee,discount_amount,total,payment_method,status,placed_at,delivered_at) VALUES
 ('00000000-0000-4000-8000-000000016031','00000000-0000-4000-8000-0000000160c1','00000000-0000-4000-8000-0000000160f1','00000000-0000-4000-8000-0000000160b1',640,30,37.2,0,0,670,'cod','delivered','2001-03-06 10:00+05:30','2001-03-06 10:30+05:30');
SET LOCAL session_replication_role=origin;

DO $$ BEGIN
 BEGIN
  -- Store price + full markup is above MRP: only the capped price is accepted.
  INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price_at_order)
  VALUES('00000000-0000-4000-8000-000000016031','00000000-0000-4000-8000-000000016011','00000000-0000-4000-8000-000000016021',1,315);
  RAISE EXCEPTION 'Above-MRP price accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price_at_order) VALUES
 ('00000000-0000-4000-8000-000000016031','00000000-0000-4000-8000-000000016011','00000000-0000-4000-8000-000000016021',2,310),
 ('00000000-0000-4000-8000-000000016031','00000000-0000-4000-8000-000000016012',null,1,20);

DO $$ DECLARE o orders; e jsonb; r jsonb; BEGIN
 IF (SELECT store_unit_price_at_order FROM order_items WHERE variant_id='00000000-0000-4000-8000-000000016021')<>300
 OR (SELECT variant_mrp_at_order FROM order_items WHERE variant_id='00000000-0000-4000-8000-000000016021')<>310
 OR (SELECT store_unit_price_at_order FROM order_items WHERE product_id='00000000-0000-4000-8000-000000016012')<>20 THEN
  RAISE EXCEPTION 'Store price not kept on the line'; END IF;
 SELECT * INTO o FROM orders WHERE id='00000000-0000-4000-8000-000000016031';
 IF o.store_item_total<>620 THEN RAISE EXCEPTION 'Store total wrong: %', o.store_item_total; END IF;

 IF compute_store_payouts('2001-03-05 00:00+05:30','2001-03-12 00:00+05:30','2001-03-05','2001-03-12')<>1 THEN RAISE EXCEPTION 'No payout row'; END IF;
 IF NOT EXISTS(SELECT 1 FROM payouts WHERE store_id='00000000-0000-4000-8000-0000000160f1' AND gross_amount=620 AND commission_deducted=37.2 AND net_payout=582.8) THEN
  RAISE EXCEPTION 'Store paid on the customer price'; END IF;

 e:=admin_money_summary('2001-03-05 00:00+05:30','2001-03-12 00:00+05:30')->'earned';
 IF (e->>'itemSales')::numeric<>640 OR (e->>'markup')::numeric<>20 OR (e->>'storeShare')::numeric<>582.8
 OR (e->>'net')::numeric<>87.2 THEN RAISE EXCEPTION 'Money summary wrong: %', e; END IF;
 IF (e->>'storeShare')::numeric+(e->>'riderPay')::numeric+(e->>'net')::numeric<>(e->>'customerPaid')::numeric THEN RAISE EXCEPTION 'Split does not add up: %', e; END IF;
 SELECT x INTO r FROM jsonb_array_elements(admin_money_summary('2001-03-05 00:00+05:30','2001-03-12 00:00+05:30')->'stores'->'rows') x
  WHERE x->>'storeId'='00000000-0000-4000-8000-0000000160f1';
 IF (r->>'periodSales')::numeric<>620 OR (r->>'periodShare')::numeric<>582.8 THEN RAISE EXCEPTION 'Store row wrong: %', r; END IF;
END $$;
ROLLBACK;
