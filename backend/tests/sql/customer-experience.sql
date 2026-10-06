\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_checkout_tests' THEN RAISE EXCEPTION 'Use disposable fixture'; END IF; END $$;
ALTER TABLE users ADD COLUMN phone text,ADD COLUMN name text,ADD COLUMN birthday date,ADD COLUMN expo_push_token text;
ALTER TABLE addresses ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE addresses ADD COLUMN label text,ADD COLUMN line1 text,ADD COLUMN landmark text,ADD COLUMN recipient_name text,ADD COLUMN recipient_phone text,ADD COLUMN delivery_instructions text,ADD COLUMN is_default boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN name text DEFAULT 'Rice',ADD COLUMN image_url text DEFAULT 'https://test.invalid/rice.png',ADD COLUMN local_name text,ADD COLUMN sub_category_id uuid,ADD COLUMN category text DEFAULT 'pantry',ADD COLUMN is_veg boolean DEFAULT true;
CREATE TABLE sub_categories(id uuid PRIMARY KEY,category_id uuid,name text,is_active boolean DEFAULT true);
ALTER TABLE promo_codes ADD COLUMN is_active boolean DEFAULT true,ADD COLUMN expires_at timestamptz,ADD COLUMN usage_limit integer,ADD COLUMN min_order_value numeric DEFAULT 0,ADD COLUMN discount_type text DEFAULT 'flat',ADD COLUMN discount_value numeric DEFAULT 1,ADD COLUMN max_discount_amount numeric;
ALTER TABLE customer_notifications ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ADD COLUMN customer_id uuid;
CREATE TABLE IF NOT EXISTS customer_push_devices(installation_id uuid PRIMARY KEY,customer_id uuid,revision bigint,token text);
CREATE TABLE support_tickets(id uuid PRIMARY KEY,customer_id uuid,status text);
CREATE TABLE wishlist_items(id uuid PRIMARY KEY,customer_id uuid,product_id uuid);
\i backend/migrations/082_customer_startup_addresses_auth.sql
\i backend/migrations/083_atomic_promos_receipt_snapshots.sql
\i backend/migrations/084_address_scoped_browse_search.sql
\i backend/migrations/085_push_receipts_account_deletion.sql
\i backend/migrations/086_counted_pack_inventory_popularity.sql
DO $$ DECLARE a jsonb;b jsonb;r customer_deletion_requests; denied integer; BEGIN
 -- Same request is durable, owned and idempotent; another account cannot complete it.
 INSERT INTO users(id,role,is_approved,phone,name) VALUES('00000000-0000-4000-8000-000000000099','customer',true,'919999999999','Fixture customer');
 INSERT INTO auth.users(id,phone) VALUES('00000000-0000-4000-8000-000000000099','919999999999');
 r:=request_customer_deletion('00000000-0000-4000-8000-000000000099','Please delete');
 IF (request_customer_deletion(r.customer_id,'Retry')).id<>r.id THEN RAISE EXCEPTION 'Duplicate request'; END IF;
 BEGIN PERFORM review_customer_deletion(r.id,r.customer_id,true,'Approve');RAISE EXCEPTION 'Customer approved own deletion';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Admin and review note required' THEN RAISE; END IF;END;
 INSERT INTO support_tickets VALUES(gen_random_uuid(),r.customer_id,'open');
 BEGIN PERFORM review_customer_deletion(r.id,'00000000-0000-4000-8000-000000000006',true,'Reviewed');RAISE EXCEPTION 'Unresolved support approved';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Resolve active orders, refunds and support before deletion' THEN RAISE;END IF;END;
 UPDATE support_tickets SET status='closed' WHERE customer_id=r.customer_id;
 a:=manage_customer_address(r.customer_id,'create',null,jsonb_build_object('zone_id','00000000-0000-4000-8000-000000000001','line1','Private address','recipient_name','Fixture','latitude',13.27,'longitude',74.75));
 b:=manage_customer_address(r.customer_id,'create',null,jsonb_build_object('zone_id','00000000-0000-4000-8000-000000000001','line1','Second address','recipient_name','Fixture','latitude',13.27,'longitude',74.75));
 PERFORM manage_customer_address(r.customer_id,'default',(b->>'id')::uuid,'{}');
 IF (SELECT count(*) FROM addresses WHERE user_id=r.customer_id AND is_default)<>1 THEN RAISE EXCEPTION 'Default uniqueness'; END IF;
 PERFORM manage_customer_address(r.customer_id,'delete',(b->>'id')::uuid,'{}');
 IF NOT (SELECT is_default FROM addresses WHERE id=(a->>'id')::uuid) THEN RAISE EXCEPTION 'Default not promoted';END IF;
 r:=review_customer_deletion(r.id,'00000000-0000-4000-8000-000000000006',true,'Reviewed');
 BEGIN PERFORM complete_customer_deletion(r.id,'00000000-0000-4000-8000-000000000006');RAISE EXCEPTION 'Completed without disabling identity';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Disable the verified auth identity before completion' THEN RAISE;END IF;END;
 UPDATE auth.users SET deleted_at=now() WHERE id=r.customer_id;
 PERFORM complete_customer_deletion(r.id,'00000000-0000-4000-8000-000000000006');
 PERFORM complete_customer_deletion(r.id,'00000000-0000-4000-8000-000000000006');
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=r.customer_id AND name IS NULL AND phone='deleted:'||id::text AND deletion_completed_at IS NOT NULL) THEN RAISE EXCEPTION 'Identity not removed'; END IF;
 IF EXISTS(SELECT 1 FROM addresses WHERE user_id=r.customer_id AND(deleted_at IS NULL OR line1<>'Address removed' OR latitude IS NOT NULL)) THEN RAISE EXCEPTION 'Unused addresses not removed'; END IF;
 IF (SELECT status FROM customer_deletion_requests WHERE id=r.id)<>'completed' THEN RAISE EXCEPTION 'Completion not durable'; END IF;
 denied:=claim_auth_budget(jsonb_build_array(jsonb_build_object('key',repeat('a',64),'limit',1)));
 IF denied<>0 OR claim_auth_budget(jsonb_build_array(jsonb_build_object('key',repeat('a',64),'limit',1)))=0 THEN RAISE EXCEPTION 'Auth budget failed'; END IF;
 IF (SELECT hits FROM auth_abuse_windows WHERE bucket=repeat('a',64))<>2 THEN RAISE EXCEPTION 'Denied budget rolled back'; END IF;
 IF has_function_privilege('anon','request_customer_deletion(uuid,text)','EXECUTE') OR has_function_privilege('authenticated','complete_customer_deletion(uuid,uuid)','EXECUTE') OR has_table_privilege('authenticated','customer_deletion_requests','SELECT') THEN RAISE EXCEPTION 'Deletion permissions exposed'; END IF;
END $$;
DO $$ DECLARE o orders; searched integer; pack uuid:='00000000-0000-4000-8000-000000000111'; BEGIN
 UPDATE products SET stock_quantity=100,name='Potato',image_url='https://test.invalid/potato.png' WHERE id='00000000-0000-4000-8000-000000000100';
 o:=test_order(1);
 UPDATE products SET name='Renamed potato',image_url='https://test.invalid/new.png' WHERE id='00000000-0000-4000-8000-000000000100';
 IF NOT EXISTS(SELECT 1 FROM order_items WHERE order_id=o.id AND product_name_at_order='Potato' AND product_image_at_order='https://test.invalid/potato.png') THEN RAISE EXCEPTION 'Receipt changed with catalogue'; END IF;
 SELECT count(*) INTO searched FROM search_customer_product_ids(ARRAY['00000000-0000-4000-8000-000000000010'::uuid],'aloo');
 IF searched<>1 THEN RAISE EXCEPTION 'Search synonym failed'; END IF;
 IF EXISTS(SELECT 1 FROM search_customer_product_ids(ARRAY['00000000-0000-4000-8000-000000000020'::uuid],'aloo')) THEN RAISE EXCEPTION 'Search crossed delivery scope'; END IF;
 UPDATE orders SET status='cancelled' WHERE id=o.id;
 INSERT INTO product_variants(id,product_id,unit_type,quantity,price,is_default) VALUES(pack,'00000000-0000-4000-8000-000000000100','kg',1,10,true);
 PERFORM set_product_pack_stock('00000000-0000-4000-8000-000000000100',pack,2);
 o:=create_order('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002',20,20,1,40,jsonb_build_array(jsonb_build_object('product_id','00000000-0000-4000-8000-000000000100','variant_id',pack,'quantity',2,'unit_price_at_order',10)),null,0,'cod',0);
 IF (SELECT stock_quantity FROM product_variants WHERE id=pack)<>0 THEN RAISE EXCEPTION 'Variant reservation missing'; END IF;
 BEGIN PERFORM test_order(1); RAISE EXCEPTION 'Depleted pack ordered';EXCEPTION WHEN raise_exception THEN IF SQLERRM='Depleted pack ordered' THEN RAISE; END IF;END;
 UPDATE orders SET status='cancelled' WHERE id=o.id;
 UPDATE orders SET status='cancelled' WHERE id=o.id;
 IF (SELECT stock_quantity FROM product_variants WHERE id=pack)<>2 OR (SELECT stock_quantity FROM products WHERE id='00000000-0000-4000-8000-000000000100')<>2 THEN RAISE EXCEPTION 'Pack release missing or duplicated'; END IF;
END $$;
-- A late receipt cannot disable a token rotated after the send.
DO $$ DECLARE job customer_push_receipts; BEGIN
 INSERT INTO customer_notifications(id,customer_id) VALUES('00000000-0000-4000-8000-000000000888','00000000-0000-4000-8000-000000000003');
 INSERT INTO customer_push_devices VALUES('00000000-0000-4000-8000-000000000777','00000000-0000-4000-8000-000000000003',2,'ExpoPushToken[new]');
 INSERT INTO customer_push_receipts(id,notification_id,customer_id,installation_id,device_revision,next_attempt_at) VALUES('ticket','00000000-0000-4000-8000-000000000888','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000777',1,now());
 SELECT * INTO job FROM claim_push_receipts() LIMIT 1;
 IF save_push_receipt(job.id,gen_random_uuid(),'failed','DeviceNotRegistered') THEN RAISE EXCEPTION 'Stale worker committed'; END IF;
 PERFORM save_push_receipt(job.id,job.lease_token,'failed','DeviceNotRegistered');
 IF (SELECT token FROM customer_push_devices WHERE installation_id=job.installation_id)<>'ExpoPushToken[new]' THEN RAISE EXCEPTION 'Rotated token disabled'; END IF;
END $$;
