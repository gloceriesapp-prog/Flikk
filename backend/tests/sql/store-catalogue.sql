\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000180a0','Store catalogue zone','store-catalogue-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES('00000000-0000-4000-8000-0000000180d1','+919999180001','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng,is_active) VALUES
 ('00000000-0000-4000-8000-0000000180f1','00000000-0000-4000-8000-0000000180d1','00000000-0000-4000-8000-0000000180a0','Selected shop','grocery','Test',12.97,77.59,true),
 ('00000000-0000-4000-8000-0000000180f2','00000000-0000-4000-8000-0000000180d1','00000000-0000-4000-8000-0000000180a0','Other shop','grocery','Test',12.97,77.59,true);
INSERT INTO categories(id,name,is_active) VALUES
 ('00000000-0000-4000-8000-0000000180c1','Drinks',true),('00000000-0000-4000-8000-0000000180c2','Snacks',true);
INSERT INTO sub_categories(id,category_id,name,is_active) VALUES
 ('00000000-0000-4000-8000-0000000180b1','00000000-0000-4000-8000-0000000180c1','Milk',true),
 ('00000000-0000-4000-8000-0000000180b2','00000000-0000-4000-8000-0000000180c1','Juices',true),
 ('00000000-0000-4000-8000-0000000180b3','00000000-0000-4000-8000-0000000180c2','Chips',true);
INSERT INTO products(id,store_id,name,unit,price,original_price,category,sub_category_id,approval_status,is_in_stock,preorder_enabled,is_veg) VALUES
 ('00000000-0000-4000-8000-000000018011','00000000-0000-4000-8000-0000000180f1','Milk','1 L',50,60,'Milk','00000000-0000-4000-8000-0000000180b1','approved',true,false,true),
 ('00000000-0000-4000-8000-000000018012','00000000-0000-4000-8000-0000000180f1','Juice','1 L',50,null,'Juices','00000000-0000-4000-8000-0000000180b2','approved',true,false,true),
 ('00000000-0000-4000-8000-000000018013','00000000-0000-4000-8000-0000000180f1','Chips','100 g',100,null,'Chips','00000000-0000-4000-8000-0000000180b3','approved',true,false,true),
 ('00000000-0000-4000-8000-000000018014','00000000-0000-4000-8000-0000000180f2','Other milk','1 L',50,60,'Milk','00000000-0000-4000-8000-0000000180b1','approved',true,false,true),
 ('00000000-0000-4000-8000-000000018015','00000000-0000-4000-8000-0000000180f1','Pending milk','1 L',50,60,'Milk','00000000-0000-4000-8000-0000000180b1','pending',true,false,true),
 ('00000000-0000-4000-8000-000000018016','00000000-0000-4000-8000-0000000180f1','Preorder milk','1 L',50,60,'Milk','00000000-0000-4000-8000-0000000180b1','approved',true,true,true);
INSERT INTO product_options(id,product_id,name,is_available) VALUES
 ('00000000-0000-4000-8000-000000018031','00000000-0000-4000-8000-000000018012','Mango flavour',true);
SET LOCAL session_replication_role=origin;
DO $$
DECLARE shop uuid := '00000000-0000-4000-8000-0000000180f1'; cat uuid := '00000000-0000-4000-8000-0000000180c1';
 sub uuid := '00000000-0000-4000-8000-0000000180b1'; n integer; first_id uuid; first_score double precision; last_id uuid;
BEGIN
 -- Closed shops retain their approved catalogue; suspension never does.
 UPDATE stores SET is_active=false WHERE id=shop;
 IF NOT store_catalogue_is_browsable(shop) THEN RAISE EXCEPTION 'Closed shop hidden'; END IF;
 SELECT count(*) INTO n FROM store_catalogue_page_ids(shop,NULL,NULL,'',false,false,'all','relevance',NULL,NULL,30);
 IF n<>3 THEN RAISE EXCEPTION 'Closed shop catalogue disappeared'; END IF;
 UPDATE stores SET admin_suspended=true WHERE id=shop;
 IF store_catalogue_is_browsable(shop) THEN RAISE EXCEPTION 'Suspended shop browsable'; END IF;
 SELECT count(*) INTO n FROM store_catalogue_page_ids(shop,NULL,NULL,'',false,false,'all','relevance',NULL,NULL,30);
 IF n<>0 THEN RAISE EXCEPTION 'Suspended shop catalogue leaked'; END IF;
 UPDATE stores SET admin_suspended=false WHERE id=shop;
 UPDATE users SET partner_suspended=true WHERE id='00000000-0000-4000-8000-0000000180d1';
 IF store_catalogue_is_browsable(shop) THEN RAISE EXCEPTION 'Suspended partner browsable'; END IF;
 UPDATE users SET partner_suspended=false,is_approved=false WHERE id='00000000-0000-4000-8000-0000000180d1';
 IF store_catalogue_is_browsable(shop) THEN RAISE EXCEPTION 'Unapproved partner browsable'; END IF;
 UPDATE users SET is_approved=true WHERE id='00000000-0000-4000-8000-0000000180d1';
 SELECT count(*) INTO n FROM store_catalogue_page_ids(shop,NULL,NULL,'',false,false,'all','relevance',NULL,NULL,30);
 IF n<>3 THEN RAISE EXCEPTION 'Store scope leaked unapproved, preorder or another store'; END IF;
 SELECT count(*) INTO n FROM store_catalogue_page_ids(shop,cat,NULL,'',false,false,'all','relevance',NULL,NULL,30);
 IF n<>2 THEN RAISE EXCEPTION 'Parent category omitted a child or included another category'; END IF;
 SELECT count(*) INTO n FROM store_catalogue_page_ids(shop,cat,sub,'',false,false,'all','relevance',NULL,NULL,30);
 IF n<>1 THEN RAISE EXCEPTION 'Subcategory scope failed'; END IF;
 SELECT count(*) INTO n FROM store_catalogue_page_ids(shop,'00000000-0000-4000-8000-0000000180c2',sub,'',false,false,'all','relevance',NULL,NULL,30);
 IF n<>0 THEN RAISE EXCEPTION 'Unrelated subcategory crossed parent'; END IF;
 SELECT count(*) INTO n FROM store_catalogue_page_ids(shop,cat,NULL,'Mango',false,false,'all','relevance',NULL,NULL,30);
 IF n<>1 THEN RAISE EXCEPTION 'Store-local flavour search failed'; END IF;
 SELECT count(*) INTO n FROM store_catalogue_page_ids(shop,cat,NULL,'',true,true,'under_100','price_low',NULL,NULL,30);
 IF n<>1 THEN RAISE EXCEPTION 'Combined filters failed'; END IF;
 SELECT id,score INTO first_id,first_score FROM store_catalogue_page_ids(shop,cat,NULL,'',false,false,'all','price_low',NULL,NULL,1);
 SELECT id INTO last_id FROM store_catalogue_page_ids(shop,cat,NULL,'',false,false,'all','price_low',first_score,first_id,1);
 IF first_id IS NULL OR last_id IS NULL OR first_id=last_id THEN RAISE EXCEPTION 'Tied-price keyset pagination failed'; END IF;
 UPDATE categories SET is_active=false WHERE id=cat;
 SELECT count(*) INTO n FROM store_catalogue_page_ids(shop,cat,NULL,'',false,false,'all','relevance',NULL,NULL,30);
 IF n<>0 THEN RAISE EXCEPTION 'Inactive category visible'; END IF;
 IF has_function_privilege('anon','public.store_catalogue_page_ids(uuid,uuid,uuid,text,boolean,boolean,text,text,double precision,uuid,integer)','EXECUTE') THEN
  RAISE EXCEPTION 'Anonymous role can bypass backend'; END IF;
END $$;
ROLLBACK;
