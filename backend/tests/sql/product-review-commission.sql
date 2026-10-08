\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','review_product_changes(uuid,boolean)','EXECUTE')
 OR has_function_privilege('authenticated','review_product_changes(uuid,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Review RPC exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','review_product_changes(uuid,boolean)','EXECUTE') THEN RAISE EXCEPTION 'API cannot review product changes'; END IF;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-000000000ca0','Review zone','review-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES('00000000-0000-4000-8000-000000000cd1','+919999970001','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-000000000cf1','00000000-0000-4000-8000-000000000cd1','00000000-0000-4000-8000-000000000ca0','Review shop','grocery','Test',12.97,77.59);
-- Rice: live (approved), 1 kg at 60 (8 packs) and 5 kg at 280 (2 packs).
INSERT INTO products(id,store_id,name,unit,price,category,stock_status,approval_status,stock_quantity,stock_tracking_enabled) VALUES
 ('00000000-0000-4000-8000-000000000c01','00000000-0000-4000-8000-000000000cf1','Rice','1 kg',60,'Staples','low_stock','approved',10,true),
 ('00000000-0000-4000-8000-000000000c02','00000000-0000-4000-8000-000000000cf1','Bad name','1 pc',10,'Staples','in_stock','rejected',NULL,false);
INSERT INTO product_variants(id,product_id,unit_type,quantity,price,is_default,stock_quantity) VALUES
 ('00000000-0000-4000-8000-000000000c11','00000000-0000-4000-8000-000000000c01','kg',1,60,true,8),
 ('00000000-0000-4000-8000-000000000c12','00000000-0000-4000-8000-000000000c01','kg',5,280,false,2),
 ('00000000-0000-4000-8000-000000000c13','00000000-0000-4000-8000-000000000c02','pc',1,10,true,NULL);
SET LOCAL session_replication_role=origin;

DO $$
DECLARE pid constant uuid:='00000000-0000-4000-8000-000000000c01'; shop constant uuid:='00000000-0000-4000-8000-000000000cf1';
 p products; created uuid;
BEGIN
 -- 1. A partner renames a live product and raises a price while recounting
 --    stock: name and prices are queued, the stock applies live.
 PERFORM save_catalogue_product(pid,shop,'{"name":"Premium rice","price":65,"unit":"1 kg","category":"Rice"}',
  '[{"id":"00000000-0000-4000-8000-000000000c11","unit_type":"kg","quantity":1,"price":65,"stock_quantity":20},
    {"id":"00000000-0000-4000-8000-000000000c12","unit_type":"kg","quantity":5,"price":280}]');
 SELECT * INTO p FROM products WHERE id=pid;
 IF p.name<>'Rice' OR p.price<>60 OR p.unit<>'1 kg' OR p.approval_status<>'approved' THEN RAISE EXCEPTION 'Live product changed before review: %',row_to_json(p); END IF;
 IF p.category<>'Rice' THEN RAISE EXCEPTION 'Unreviewed field did not apply'; END IF;
 IF (SELECT price FROM product_variants WHERE id='00000000-0000-4000-8000-000000000c11')<>60 THEN RAISE EXCEPTION 'Live pack price changed'; END IF;
 IF (SELECT stock_quantity FROM product_variants WHERE id='00000000-0000-4000-8000-000000000c11')<>20 OR p.stock_quantity<>22 THEN
  RAISE EXCEPTION 'Stock count did not apply live'; END IF;
 IF p.pending_changes->>'name'<>'Premium rice' OR (p.pending_changes->>'price')::numeric<>65
 OR jsonb_array_length(p.pending_changes->'variants')<>2 OR p.pending_changes_at IS NULL THEN
  RAISE EXCEPTION 'Change not queued: %',p.pending_changes; END IF;
 IF (p.pending_changes->'variants'->0) ? 'stock_quantity' THEN RAISE EXCEPTION 'Queued pack would overwrite live stock'; END IF;

 -- 2. A stock-only edit that resends the live name/prices keeps the queued change.
 PERFORM save_catalogue_product(pid,shop,'{"name":"Rice","price":60,"unit":"1 kg"}',
  '[{"id":"00000000-0000-4000-8000-000000000c11","unit_type":"kg","quantity":1,"price":60,"stock_quantity":18},
    {"id":"00000000-0000-4000-8000-000000000c12","unit_type":"kg","quantity":5,"price":280}]');
 SELECT * INTO p FROM products WHERE id=pid;
 IF p.pending_changes->>'name'<>'Premium rice' OR jsonb_array_length(p.pending_changes->'variants')<>2 THEN RAISE EXCEPTION 'Stock edit dropped queued change'; END IF;
 IF p.stock_quantity<>20 THEN RAISE EXCEPTION 'Stock edit lost'; END IF;

 -- 3. Approving applies the name and prices and keeps the live stock count.
 IF NOT review_product_changes(pid,true) THEN RAISE EXCEPTION 'Nothing to approve'; END IF;
 SELECT * INTO p FROM products WHERE id=pid;
 IF p.name<>'Premium rice' OR p.price<>65 OR p.pending_changes IS NOT NULL OR p.pending_changes_at IS NOT NULL THEN
  RAISE EXCEPTION 'Approval did not apply: %',row_to_json(p); END IF;
 IF (SELECT price FROM product_variants WHERE id='00000000-0000-4000-8000-000000000c11')<>65
 OR (SELECT stock_quantity FROM product_variants WHERE id='00000000-0000-4000-8000-000000000c11')<>18
 OR p.stock_quantity<>20 THEN RAISE EXCEPTION 'Approval lost pack stock'; END IF;
 IF review_product_changes(pid,true) THEN RAISE EXCEPTION 'Empty queue reported a change'; END IF;

 -- 4. A new pack on a live product is reviewed too; rejecting drops it.
 PERFORM save_catalogue_product(pid,shop,'{}',
  '[{"id":"00000000-0000-4000-8000-000000000c11","unit_type":"kg","quantity":1,"price":65},
    {"id":"00000000-0000-4000-8000-000000000c12","unit_type":"kg","quantity":5,"price":280},
    {"unit_type":"kg","quantity":10,"price":540,"stock_quantity":3}]');
 IF (SELECT count(*) FROM product_variants WHERE product_id=pid)<>2 THEN RAISE EXCEPTION 'New pack went live unreviewed'; END IF;
 IF NOT review_product_changes(pid,false) THEN RAISE EXCEPTION 'Nothing to reject'; END IF;
 IF (SELECT count(*) FROM product_variants WHERE product_id=pid)<>2 OR (SELECT pending_changes FROM products WHERE id=pid) IS NOT NULL THEN
  RAISE EXCEPTION 'Reject did not drop the change'; END IF;

 -- 5. Approving a new pack inserts it with the count it was submitted with.
 PERFORM save_catalogue_product(pid,shop,'{}',
  '[{"id":"00000000-0000-4000-8000-000000000c11","unit_type":"kg","quantity":1,"price":65},
    {"unit_type":"kg","quantity":10,"price":540,"stock_quantity":3}]');
 IF (SELECT count(*) FROM product_variants WHERE product_id=pid)<>2 THEN RAISE EXCEPTION 'Queued edit removed a pack early'; END IF;
 PERFORM review_product_changes(pid,true);
 IF (SELECT count(*) FROM product_variants WHERE product_id=pid)<>2
 OR (SELECT stock_quantity FROM product_variants WHERE product_id=pid AND quantity=10)<>3
 OR EXISTS(SELECT 1 FROM product_variants WHERE id='00000000-0000-4000-8000-000000000c12') THEN RAISE EXCEPTION 'Approved pack list wrong'; END IF;

 -- 6. Removing a pack without touching prices applies live.
 PERFORM save_catalogue_product(pid,shop,'{}','[{"id":"00000000-0000-4000-8000-000000000c11","unit_type":"kg","quantity":1,"price":65}]');
 IF (SELECT count(*) FROM product_variants WHERE product_id=pid)<>1 OR (SELECT pending_changes FROM products WHERE id=pid) IS NOT NULL THEN
  RAISE EXCEPTION 'Pack removal was not live'; END IF;

 -- 7. Admin edits (no store scope) still apply directly.
 PERFORM save_catalogue_product(pid,NULL,'{"name":"Rice (admin)"}',NULL);
 IF (SELECT name FROM products WHERE id=pid)<>'Rice (admin)' THEN RAISE EXCEPTION 'Admin edit was queued'; END IF;

 -- 8. Editing a rejected product sends it back for review, edits applied.
 PERFORM save_catalogue_product('00000000-0000-4000-8000-000000000c02',shop,'{"name":"Good name","approval_status":"approved"}',NULL);
 SELECT * INTO p FROM products WHERE id='00000000-0000-4000-8000-000000000c02';
 IF p.approval_status<>'pending' OR p.name<>'Good name' OR p.pending_changes IS NOT NULL THEN RAISE EXCEPTION 'Rejected product not resubmitted: %',row_to_json(p); END IF;

 -- 9. A partner can never self-approve a new or edited product.
 created:=save_catalogue_product(NULL,shop,'{"name":"Dal","unit":"1 kg","price":120,"category":"Staples","approval_status":"approved"}','[{"unit_type":"kg","quantity":1,"price":120}]');
 IF (SELECT approval_status FROM products WHERE id=created)<>'pending' THEN RAISE EXCEPTION 'Partner self-approved a new product'; END IF;
 PERFORM save_catalogue_product(created,shop,'{"approval_status":"approved"}',NULL);
 IF (SELECT approval_status FROM products WHERE id=created)<>'pending' THEN RAISE EXCEPTION 'Partner self-approved an edit'; END IF;
END $$;
ROLLBACK;
SELECT 'Live product name/price edits wait for review; rejected products return to review' AS result;
