\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','save_catalogue_product(uuid,uuid,jsonb,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','save_catalogue_product(uuid,uuid,jsonb,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Catalogue RPC exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','save_catalogue_product(uuid,uuid,jsonb,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'API cannot save products'; END IF;
END $$;

-- Fixture rows bypass triggers; every assertion below runs with them on.
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-000000000ba0','Catalogue zone','catalogue-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-000000000bc1','+919999980001','customer',true),
 ('00000000-0000-4000-8000-000000000bd1','+919999980002','store_owner',true),
 ('00000000-0000-4000-8000-000000000bd2','+919999980003','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-000000000bf1','00000000-0000-4000-8000-000000000bd1','00000000-0000-4000-8000-000000000ba0','Shop one','grocery','Test',12.97,77.59),
 ('00000000-0000-4000-8000-000000000bf2','00000000-0000-4000-8000-000000000bd2','00000000-0000-4000-8000-000000000ba0','Shop two','grocery','Test',12.98,77.60);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-000000000bb1','00000000-0000-4000-8000-000000000bc1','1 Test Road','00000000-0000-4000-8000-000000000ba0');
-- Onion: 250 g (12 packs, reserved by a live order) and 1 kg (5 packs).
-- Not yet approved, so partner price edits apply directly (a live product's
-- price edits are queued for review instead: product-change-review.sql).
INSERT INTO products(id,store_id,name,unit,price,category,stock_status,approval_status,stock_quantity,stock_tracking_enabled,local_name,description,freshness_tag,is_veg) VALUES
 ('00000000-0000-4000-8000-000000000b01','00000000-0000-4000-8000-000000000bf1','Onion','250 g',15,'Vegetables & Fruits','in_stock','pending',17,true,'Pyaz','Admin copy','Fresh today',true);
INSERT INTO product_variants(id,product_id,unit_type,quantity,price,is_default,stock_quantity) VALUES
 ('00000000-0000-4000-8000-000000000b11','00000000-0000-4000-8000-000000000b01','g',250,15,true,12),
 ('00000000-0000-4000-8000-000000000b12','00000000-0000-4000-8000-000000000b01','kg',1,52,false,5);
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,status)
 VALUES('00000000-0000-4000-8000-000000000b21','00000000-0000-4000-8000-000000000bc1','00000000-0000-4000-8000-000000000bf1','00000000-0000-4000-8000-000000000bb1',15,20,1.5,35,'cod','placed');
INSERT INTO order_items(id,order_id,product_id,variant_id,quantity,unit_price_at_order)
 VALUES('00000000-0000-4000-8000-000000000b31','00000000-0000-4000-8000-000000000b21','00000000-0000-4000-8000-000000000b01','00000000-0000-4000-8000-000000000b11',1,15);
INSERT INTO inventory_reservations(order_item_id,order_id,product_id,variant_id,quantity,state)
 VALUES('00000000-0000-4000-8000-000000000b31','00000000-0000-4000-8000-000000000b21','00000000-0000-4000-8000-000000000b01','00000000-0000-4000-8000-000000000b11',1,'committed');
SET LOCAL session_replication_role=origin;

DO $$
DECLARE pid constant uuid:='00000000-0000-4000-8000-000000000b01'; shop constant uuid:='00000000-0000-4000-8000-000000000bf1';
 p products; created uuid; n integer;
BEGIN
 -- 1. Editing the price (variant ids sent) keeps every pack's stock and id.
 PERFORM save_catalogue_product(pid,shop,'{"name":"Onion","price":16,"unit":"250 g"}',
  '[{"id":"00000000-0000-4000-8000-000000000b11","unit_type":"g","quantity":250,"price":16},
    {"id":"00000000-0000-4000-8000-000000000b12","unit_type":"kg","quantity":1,"price":55}]');
 IF (SELECT stock_quantity FROM product_variants WHERE id='00000000-0000-4000-8000-000000000b11')<>12
 OR (SELECT stock_quantity FROM product_variants WHERE id='00000000-0000-4000-8000-000000000b12')<>5
 OR (SELECT price FROM product_variants WHERE id='00000000-0000-4000-8000-000000000b12')<>55 THEN RAISE EXCEPTION 'Price edit lost pack stock'; END IF;
 SELECT * INTO p FROM products WHERE id=pid;
 IF p.stock_quantity<>17 OR NOT p.stock_tracking_enabled OR p.price<>16 THEN RAISE EXCEPTION 'Product stock drifted: %',row_to_json(p); END IF;
 -- 2. Partial update: omitted admin metadata survives a partner edit.
 IF p.local_name IS DISTINCT FROM 'Pyaz' OR p.description IS DISTINCT FROM 'Admin copy' OR p.freshness_tag IS DISTINCT FROM 'Fresh today' THEN
  RAISE EXCEPTION 'Partner edit erased admin metadata'; END IF;

 -- 3. Without ids (older clients) packs match by size; adding a pack keeps the others' stock.
 PERFORM save_catalogue_product(pid,shop,'{}',
  '[{"unit_type":"g","quantity":250,"price":16},{"unit_type":"kg","quantity":1,"price":55},{"unit_type":"g","quantity":500,"price":30,"stock_quantity":4}]');
 IF (SELECT count(*) FROM product_variants WHERE product_id=pid)<>3
 OR (SELECT stock_quantity FROM product_variants WHERE id='00000000-0000-4000-8000-000000000b11')<>12
 OR (SELECT stock_quantity FROM product_variants WHERE id='00000000-0000-4000-8000-000000000b12')<>5
 OR (SELECT stock_quantity FROM product_variants WHERE product_id=pid AND unit_type='g' AND quantity=500)<>4 THEN RAISE EXCEPTION 'Adding a pack lost stock'; END IF;
 IF (SELECT stock_quantity FROM products WHERE id=pid)<>21 THEN RAISE EXCEPTION 'Product stock not the pack total'; END IF;

 -- 4. Removing the reserved 250 g pack is refused and nothing changes.
 BEGIN
  PERFORM save_catalogue_product(pid,shop,'{"name":"Renamed onion","price":55,"unit":"1 kg"}',
   '[{"id":"00000000-0000-4000-8000-000000000b12","unit_type":"kg","quantity":1,"price":55}]');
  RAISE EXCEPTION 'Reserved pack removed';
 EXCEPTION WHEN SQLSTATE 'P0409' THEN NULL; END;
 IF (SELECT name FROM products WHERE id=pid)<>'Onion' OR (SELECT price FROM products WHERE id=pid)<>16
 OR (SELECT count(*) FROM product_variants WHERE product_id=pid)<>3 THEN RAISE EXCEPTION 'Refused save was not atomic'; END IF;

 -- 5. Removing an unreserved pack and recounting keeps products.stock_quantity = sum of packs.
 PERFORM save_catalogue_product(pid,shop,'{}',
  '[{"id":"00000000-0000-4000-8000-000000000b11","unit_type":"g","quantity":250,"price":16,"stock_quantity":3},
    {"id":"00000000-0000-4000-8000-000000000b12","unit_type":"kg","quantity":1,"price":55}]');
 SELECT * INTO p FROM products WHERE id=pid;
 IF p.stock_quantity<>8 OR p.stock_status<>'low_stock' OR NOT p.is_in_stock
 OR p.stock_quantity<>(SELECT sum(stock_quantity) FROM product_variants WHERE product_id=pid) THEN RAISE EXCEPTION 'Stock rollup inconsistent: %',row_to_json(p); END IF;

 -- 6. Another store cannot edit this product.
 BEGIN
  PERFORM save_catalogue_product(pid,'00000000-0000-4000-8000-000000000bf2','{"name":"Stolen"}',NULL);
  RAISE EXCEPTION 'Cross-store edit accepted';
 EXCEPTION WHEN SQLSTATE 'P0404' THEN NULL; END;

 -- 7. Duplicate sizes and bad stock counts are rejected.
 BEGIN
  PERFORM save_catalogue_product(pid,shop,'{}','[{"unit_type":"kg","quantity":1,"price":55},{"unit_type":"kg","quantity":1,"price":50}]');
  RAISE EXCEPTION 'Duplicate size accepted';
 EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL; END;
 BEGIN
  PERFORM save_catalogue_product(pid,shop,'{}','[{"unit_type":"kg","quantity":1,"price":55,"stock_quantity":-1}]');
  RAISE EXCEPTION 'Negative stock accepted';
 EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL; END;

 -- 8. A new product saved with pack stock is tracked (orderable) immediately.
 created:=save_catalogue_product(NULL,NULL,
  '{"store_id":"00000000-0000-4000-8000-000000000bf2","name":"Milk","unit":"500 ml","price":28,"category":"Dairy, Bread & Eggs","stock_status":"in_stock","approval_status":"approved"}',
  '[{"unit_type":"ml","quantity":500,"price":28,"stock_quantity":20},{"unit_type":"l","quantity":1,"price":54,"stock_quantity":0}]');
 SELECT * INTO p FROM products WHERE id=created;
 IF NOT p.stock_tracking_enabled OR p.stock_quantity<>20 OR p.stock_status<>'in_stock' OR p.approval_status<>'approved' THEN
  RAISE EXCEPTION 'New product not tracked: %',row_to_json(p); END IF;
 IF NOT (SELECT is_default FROM product_variants WHERE product_id=created AND unit_type='ml') THEN RAISE EXCEPTION 'Default pack wrong'; END IF;

 -- 9. A product without any pack counts keeps its untracked state.
 created:=save_catalogue_product(NULL,shop,'{"name":"Salt","unit":"1 kg","price":20,"category":"General Store"}','[{"unit_type":"kg","quantity":1,"price":20}]');
 IF (SELECT stock_tracking_enabled FROM products WHERE id=created) THEN RAISE EXCEPTION 'Uncounted product marked tracked'; END IF;
 SELECT count(*) INTO n FROM product_variants WHERE product_id=created;
 IF n<>1 THEN RAISE EXCEPTION 'Salt packs wrong'; END IF;
END $$;
ROLLBACK;
SELECT 'Catalogue edits keep pack stock, refuse reserved-pack removal atomically and keep product stock in sync' AS result;
