\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use disposable full-schema fixture'; END IF;
END $$;
BEGIN;
DO $$
DECLARE z uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid();
 p uuid:=gen_random_uuid(); hidden uuid:=gen_random_uuid(); rules jsonb;
BEGIN
 INSERT INTO users(id,phone,role,is_approved) VALUES(u,'fixture-'||u::text,'store_owner',true);
 INSERT INTO zones(id,name,slug) VALUES(z,'Visibility fixture',z::text);
 INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,is_active)
 VALUES(s,u,z,'Closed fixture shop','grocery','Fixture',false);
 INSERT INTO products(id,store_id,name,unit,price,category,approval_status,stock_tracking_enabled,stock_quantity,stock_status,is_in_stock)
 VALUES(p,s,'Fixture incense','1 pack',25,'puja','approved',true,0,'out_of_stock',false),
 (hidden,s,'Fixture incense hidden','1 pack',25,'puja','pending',true,0,'out_of_stock',false);
 rules:=jsonb_build_array(jsonb_build_object('selection',jsonb_build_object('mode','manual','productIds',jsonb_build_array(p,hidden)),'limit',6));
 IF NOT EXISTS(SELECT 1 FROM browse_collection_ids(s,rules,NULL,true) WHERE id=p) THEN RAISE EXCEPTION 'Closed/sold-out preview disappeared'; END IF;
 IF EXISTS(SELECT 1 FROM browse_collection_ids(s,rules,NULL,true) WHERE id=hidden) THEN RAISE EXCEPTION 'Pending product leaked'; END IF;
 IF NOT EXISTS(SELECT 1 FROM browse_collection_ids(s,rules,NULL,false) WHERE id=p) THEN RAISE EXCEPTION 'Closed/sold-out collection disappeared'; END IF;
 IF NOT EXISTS(SELECT 1 FROM search_customer_product_ids(ARRAY[s],'Fixture incense',NULL,NULL,10) WHERE id=p) THEN RAISE EXCEPTION 'Closed/sold-out search disappeared'; END IF;
 IF EXISTS(SELECT 1 FROM search_customer_product_ids(ARRAY[s],'Fixture incense',NULL,NULL,10) WHERE id=hidden) THEN RAISE EXCEPTION 'Pending search product leaked'; END IF;
END;
$$;
ROLLBACK;
SELECT 'Closed/sold-out visibility and approval boundaries verified' AS result;
