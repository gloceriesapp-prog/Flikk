\set ON_ERROR_STOP on
-- Original items and added flavours remain distinct at checkout;
-- added flavours must be its own and in stock; the original remains purchasable.
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

-- Flavour search returns the parent once, with the exact matching option.
DO $$
DECLARE matched uuid; parent uuid; total integer; first_score double precision; first_id uuid;
BEGIN
 SELECT id,matched_option_id INTO parent,matched FROM search_customer_product_matches(
  ARRAY['00000000-0000-4000-8000-0000000170f1'::uuid], 'Achaari Masti', NULL, NULL, 10);
 IF parent IS DISTINCT FROM '00000000-0000-4000-8000-000000017011'::uuid OR matched IS DISTINCT FROM '00000000-0000-4000-8000-000000017031'::uuid THEN RAISE EXCEPTION 'Flavour search did not select the matching option'; END IF;
 SELECT matched_option_id INTO matched FROM search_customer_product_matches(
  ARRAY['00000000-0000-4000-8000-0000000170f1'::uuid], 'Bingo Mad Angles', NULL, NULL, 10);
 IF matched IS NOT NULL THEN RAISE EXCEPTION 'Main product search selected a different flavour'; END IF;
 SELECT count(*) INTO total FROM search_customer_product_matches(
  ARRAY['00000000-0000-4000-8000-0000000170f1'::uuid], 'Mad', NULL, NULL, 10);
 IF total<>1 THEN RAISE EXCEPTION 'Search duplicated the parent product'; END IF;
 IF EXISTS(SELECT 1 FROM search_customer_product_matches(ARRAY['00000000-0000-4000-8000-000000017099'::uuid], 'Achaari Masti', NULL, NULL, 10)) THEN RAISE EXCEPTION 'Flavour search crossed delivery scope'; END IF;
 IF NOT EXISTS(SELECT 1 FROM search_customer_product_ids(ARRAY['00000000-0000-4000-8000-0000000170f1'::uuid], 'Achaari Masti', NULL, NULL, 10)) THEN RAISE EXCEPTION 'Legacy search lost flavour matches'; END IF;
 UPDATE products SET approval_status='pending' WHERE id='00000000-0000-4000-8000-000000017011';
 IF EXISTS(SELECT 1 FROM search_customer_product_matches(ARRAY['00000000-0000-4000-8000-0000000170f1'::uuid], 'Achaari Masti', NULL, NULL, 10)) THEN RAISE EXCEPTION 'Unapproved flavour search leaked'; END IF;
 UPDATE products SET approval_status='approved' WHERE id='00000000-0000-4000-8000-000000017011';
 INSERT INTO products(id,store_id,name,unit,price,category,approval_status,is_in_stock,stock_status,stock_tracking_enabled,stock_quantity)
 VALUES('00000000-0000-4000-8000-000000017012','00000000-0000-4000-8000-0000000170f1','Achaari Masti','1 pack',20,'Snacks','approved',true,'in_stock',true,50);
 SELECT id,score INTO first_id,first_score FROM search_customer_product_matches(ARRAY['00000000-0000-4000-8000-0000000170f1'::uuid], 'Achaari Masti', NULL, NULL, 1);
 SELECT count(*) INTO total FROM search_customer_product_matches(ARRAY['00000000-0000-4000-8000-0000000170f1'::uuid], 'Achaari Masti', first_score, first_id, 10);
 IF total<>1 THEN RAISE EXCEPTION 'Flavour search cursor skipped or repeated results'; END IF;
END $$;

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

UPDATE product_variants SET original_price=25,platform_markup=3 WHERE id='00000000-0000-4000-8000-000000017021';
UPDATE product_options SET price_overrides='{"g:72":{"price":30,"original_price":32}}' WHERE id='00000000-0000-4000-8000-000000017031';
DO $$ BEGIN
 IF has_column_privilege('anon','product_options','price_overrides','SELECT') OR has_column_privilege('authenticated','product_options','price_overrides','SELECT') THEN RAISE EXCEPTION 'Private store prices exposed'; END IF;
 IF NOT has_column_privilege('anon','product_options','name','SELECT') THEN RAISE EXCEPTION 'Existing public fields lost'; END IF;
 IF public.valid_flavour_prices('{"base":{"price":0}}') OR public.valid_flavour_prices('{"g:0":{"price":5}}') OR public.valid_flavour_prices('{"base":{"price":10,"original_price":9}}') OR public.valid_flavour_prices('{"base":{"price":1.001}}') THEN RAISE EXCEPTION 'Invalid flavour prices accepted'; END IF;
 BEGIN
  INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price_at_order,option_id)
  VALUES('00000000-0000-4000-8000-000000017041','00000000-0000-4000-8000-000000017011','00000000-0000-4000-8000-000000017021',1,20,'00000000-0000-4000-8000-000000017031');
  RAISE EXCEPTION 'Old price accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price_at_order,option_id)
VALUES('00000000-0000-4000-8000-000000017041','00000000-0000-4000-8000-000000017011','00000000-0000-4000-8000-000000017021',1,32,'00000000-0000-4000-8000-000000017031');
INSERT INTO order_items(order_id,product_id,variant_id,quantity,unit_price_at_order)
VALUES('00000000-0000-4000-8000-000000017041','00000000-0000-4000-8000-000000017011','00000000-0000-4000-8000-000000017021',1,23);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM order_items WHERE option_id='00000000-0000-4000-8000-000000017031' AND unit_price_at_order=32 AND store_unit_price_at_order=30 AND variant_mrp_at_order=32 AND option_name_at_order='Achaari Masti') THEN RAISE EXCEPTION 'Flavour price snapshot incorrect'; END IF;
 IF NOT EXISTS(SELECT 1 FROM order_items WHERE option_id IS NULL AND order_id='00000000-0000-4000-8000-000000017041' AND unit_price_at_order=23 AND store_unit_price_at_order=20) THEN RAISE EXCEPTION 'Original price changed'; END IF;
END $$;
ROLLBACK;
\echo 'Flavour pricing, snapshots and private-column permissions passed.'
