\set ON_ERROR_STOP on
-- Migration 20261105120000: a product with flavours needs one per order line;
-- it must be the product's own and in stock, and its name is kept on the line.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_table_privilege('anon','product_options','INSERT') OR has_table_privilege('authenticated','product_options','UPDATE') THEN RAISE EXCEPTION 'Flavours writable by API roles'; END IF;
END $$;
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000170a0','Flavour zone','flavour-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000170c1','+919999170001','customer',true),
 ('00000000-0000-4000-8000-0000000170d1','+919999170002','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000170f1','00000000-0000-4000-8000-0000000170d1','00000000-0000-4000-8000-0000000170a0','Flavour shop','grocery','Test',12.97,77.59);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000170b1','00000000-0000-4000-8000-0000000170c1','1 Flavour Road','00000000-0000-4000-8000-0000000170a0');
INSERT INTO products(id,store_id,name,unit,price,category,approval_status,is_in_stock,stock_status,stock_tracking_enabled,stock_quantity) VALUES
 ('00000000-0000-4000-8000-000000017011','00000000-0000-4000-8000-0000000170f1','Bingo Mad Angles','72 g',20,'Snacks','approved',true,'in_stock',true,50);
INSERT INTO product_variants(id,product_id,unit_type,quantity,price,is_default) VALUES
 ('00000000-0000-4000-8000-000000017021','00000000-0000-4000-8000-000000017011','g',72,20,true);
INSERT INTO product_options(id,product_id,name,is_available) VALUES
 ('00000000-0000-4000-8000-000000017031','00000000-0000-4000-8000-000000017011','Achaari Masti',true),
 ('00000000-0000-4000-8000-000000017032','00000000-0000-4000-8000-000000017011','Tomato Madness',false);
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,handling_fee,discount_amount,total,payment_method,status,placed_at,reservation_expires_at,reservation_release_after) VALUES
 ('00000000-0000-4000-8000-000000017041','00000000-0000-4000-8000-0000000170c1','00000000-0000-4000-8000-0000000170f1','00000000-0000-4000-8000-0000000170b1',40,30,0,0,0,70,'cod','placed','2001-04-01 10:00+05:30','2001-04-01 10:20+05:30','2001-04-01 10:50+05:30');
SET LOCAL session_replication_role=origin;

-- Round-trip and reject malformed flavour galleries without touching orders.
DO $$
DECLARE saved text[];
BEGIN
 UPDATE product_options SET image_url='https://cdn.example/cover.webp', extra_image_urls=ARRAY['https://cdn.example/back.webp','https://cdn.example/side.webp']
 WHERE id='00000000-0000-4000-8000-000000017031';
 SELECT extra_image_urls INTO saved FROM product_options WHERE id='00000000-0000-4000-8000-000000017031';
 IF saved <> ARRAY['https://cdn.example/back.webp','https://cdn.example/side.webp'] THEN RAISE EXCEPTION 'Gallery not retained'; END IF;
 BEGIN
  UPDATE product_options SET extra_image_urls=array_fill('https://cdn.example/a.webp'::text, ARRAY[8]);
  RAISE EXCEPTION 'Oversize gallery accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE product_options SET extra_image_urls=ARRAY['javascript:alert(1)'];
  RAISE EXCEPTION 'Unsafe gallery accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE product_options SET extra_image_urls=ARRAY[NULL::text];
  RAISE EXCEPTION 'Null photo accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE product_options SET image_url=NULL, extra_image_urls=ARRAY['https://cdn.example/back.webp'];
  RAISE EXCEPTION 'Gallery without cover accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE product_options SET extra_image_urls='{}' WHERE id='00000000-0000-4000-8000-000000017031';
END $$;

DO $$ BEGIN
 BEGIN
  INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price_at_order)
  VALUES('00000000-0000-4000-8000-000000017041','00000000-0000-4000-8000-000000017011','00000000-0000-4000-8000-000000017021',1,20);
  RAISE EXCEPTION 'Line without a flavour accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN
  INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price_at_order,option_id)
  VALUES('00000000-0000-4000-8000-000000017041','00000000-0000-4000-8000-000000017011','00000000-0000-4000-8000-000000017021',1,20,'00000000-0000-4000-8000-000000017032');
  RAISE EXCEPTION 'Out-of-stock flavour accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price_at_order,option_id)
VALUES('00000000-0000-4000-8000-000000017041','00000000-0000-4000-8000-000000017011','00000000-0000-4000-8000-000000017021',2,20,'00000000-0000-4000-8000-000000017031');
DO $$ BEGIN
 IF (SELECT option_name_at_order FROM order_items WHERE order_id='00000000-0000-4000-8000-000000017041')<>'Achaari Masti' THEN RAISE EXCEPTION 'Flavour name not kept'; END IF;
 DELETE FROM product_options WHERE id='00000000-0000-4000-8000-000000017031';
 IF (SELECT option_name_at_order FROM order_items WHERE order_id='00000000-0000-4000-8000-000000017041')<>'Achaari Masti'
 OR (SELECT option_id FROM order_items WHERE order_id='00000000-0000-4000-8000-000000017041') IS NOT NULL THEN RAISE EXCEPTION 'Deleting a flavour broke the order line'; END IF;
END $$;
ROLLBACK;
