\set ON_ERROR_STOP on
-- Migration 20261027150000: hand-picked products on the Home "All" tab.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_table_privilege('anon','public.home_section_products','SELECT') OR has_table_privilege('authenticated','public.home_section_products','SELECT')
 OR has_function_privilege('authenticated','admin_set_home_section_products(text,uuid[])','EXECUTE')
 OR has_function_privilege('authenticated','admin_set_product_home_sections(uuid,text[])','EXECUTE')
 OR has_function_privilege('anon','home_pick_product_ids(uuid[],timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Pins exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','home_pick_product_ids(uuid[],timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'API cannot read pins'; END IF;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000135a0','Pin zone','pin-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000135d1','+919999135001','store_owner',true),
 ('00000000-0000-4000-8000-0000000135d2','+919999135002','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000135f1','00000000-0000-4000-8000-0000000135d1','00000000-0000-4000-8000-0000000135a0','Near shop','grocery','Test',12.97,77.59),
 ('00000000-0000-4000-8000-0000000135f2','00000000-0000-4000-8000-0000000135d2','00000000-0000-4000-8000-0000000135a0','Far shop','grocery','Test',13.97,78.59);
INSERT INTO products(id,store_id,name,unit,price,category,approval_status) VALUES
 ('00000000-0000-4000-8000-000000013501','00000000-0000-4000-8000-0000000135f1','Milk','500 ml',30,'Dairy, Bread & Eggs','approved'),
 ('00000000-0000-4000-8000-000000013502','00000000-0000-4000-8000-0000000135f1','Bread','1 pc',40,'Dairy, Bread & Eggs','approved'),
 ('00000000-0000-4000-8000-000000013503','00000000-0000-4000-8000-0000000135f1','New chips','1 pc',20,'Snacks','pending'),
 ('00000000-0000-4000-8000-000000013504','00000000-0000-4000-8000-0000000135f2','Far eggs','6 pc',60,'Dairy, Bread & Eggs','approved');
SET LOCAL session_replication_role=origin;

DO $$ DECLARE near uuid[]:=ARRAY['00000000-0000-4000-8000-0000000135f1']::uuid[]; picks text; BEGIN
 -- Custom sections need a custom-xxxxxx key, and only they may use one.
 BEGIN INSERT INTO home_sections(key,sort_index,is_custom) VALUES('my-rail',500,true); RAISE EXCEPTION 'Bad custom key accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO home_sections(key,sort_index) VALUES('custom-abc123',500); RAISE EXCEPTION 'Custom key without is_custom accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO home_sections(key,title,sort_index,is_custom) VALUES('custom-diwali1','Diwali picks',500,true);
 BEGIN UPDATE home_sections SET starts_at=now(), ends_at=now()-interval '1 day' WHERE key='custom-diwali1'; RAISE EXCEPTION 'Backwards schedule accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;

 -- Only product rails take pins.
 BEGIN PERFORM admin_set_home_section_products('nearby-stores',ARRAY['00000000-0000-4000-8000-000000013501']::uuid[]); RAISE EXCEPTION 'Store rail took products';
 EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
 BEGIN PERFORM admin_set_home_section_products('trending',ARRAY['00000000-0000-4000-8000-000000013501','00000000-0000-4000-8000-000000013501']::uuid[]); RAISE EXCEPTION 'Duplicate pin accepted';
 EXCEPTION WHEN sqlstate 'P0400' THEN NULL; END;
 BEGIN PERFORM admin_set_home_section_products('trending',(SELECT array_agg(gen_random_uuid()) FROM generate_series(1,31))); RAISE EXCEPTION '31 pins accepted';
 EXCEPTION WHEN sqlstate 'P0400' THEN NULL; END;

 -- Order is the order given; saving again replaces it.
 PERFORM admin_set_home_section_products('trending',ARRAY['00000000-0000-4000-8000-000000013502','00000000-0000-4000-8000-000000013501','00000000-0000-4000-8000-000000013503','00000000-0000-4000-8000-000000013504']::uuid[]);
 SELECT string_agg(right(id::text,2),',' ORDER BY ord) INTO picks FROM (SELECT id, row_number() OVER () ord FROM home_pick_product_ids(near) WHERE section_key='trending') x;
 -- Pending product and the far store's product are left out; order kept.
 IF picks IS DISTINCT FROM '02,01' THEN RAISE EXCEPTION 'Trending picks wrong: %', picks; END IF;

 -- Inventory's "Show on home": adds at the end, removes where unticked.
 IF admin_set_product_home_sections('00000000-0000-4000-8000-000000013501',ARRAY['trending','custom-diwali1'])<>ARRAY['custom-diwali1','trending'] THEN RAISE EXCEPTION 'Product sections wrong'; END IF;
 IF (SELECT position FROM home_section_products WHERE section_key='trending' AND product_id='00000000-0000-4000-8000-000000013501')<>1 THEN RAISE EXCEPTION 'Existing pin moved'; END IF;
 PERFORM admin_set_product_home_sections('00000000-0000-4000-8000-000000013502',ARRAY['custom-diwali1']);
 IF EXISTS(SELECT 1 FROM home_section_products WHERE section_key='trending' AND product_id='00000000-0000-4000-8000-000000013502') THEN RAISE EXCEPTION 'Unticked section kept the pin'; END IF;
 IF (SELECT position FROM home_section_products WHERE section_key='custom-diwali1' AND product_id='00000000-0000-4000-8000-000000013502')<>1 THEN RAISE EXCEPTION 'New pin not appended'; END IF;
 BEGIN PERFORM admin_set_product_home_sections('00000000-0000-4000-8000-000000013501',ARRAY['top-rated-stores']); RAISE EXCEPTION 'Store rail took a product';
 EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;

 -- Hidden or out-of-schedule sections show nothing.
 UPDATE home_sections SET starts_at=now()+interval '1 day' WHERE key='custom-diwali1';
 IF EXISTS(SELECT 1 FROM home_pick_product_ids(near) WHERE section_key='custom-diwali1') THEN RAISE EXCEPTION 'Future section is live'; END IF;
 IF NOT EXISTS(SELECT 1 FROM home_pick_product_ids(near, now()+interval '2 days') WHERE section_key='custom-diwali1') THEN RAISE EXCEPTION 'Scheduled section never goes live'; END IF;
 UPDATE home_sections SET enabled=false WHERE key='trending';
 IF EXISTS(SELECT 1 FROM home_pick_product_ids(near) WHERE section_key='trending') THEN RAISE EXCEPTION 'Hidden section is live'; END IF;

 -- Deleting a custom section or a product removes its pins.
 DELETE FROM home_sections WHERE key='custom-diwali1';
 IF EXISTS(SELECT 1 FROM home_section_products WHERE section_key='custom-diwali1') THEN RAISE EXCEPTION 'Pins outlived their section'; END IF;
 DELETE FROM products WHERE id='00000000-0000-4000-8000-000000013501';
 IF EXISTS(SELECT 1 FROM home_section_products WHERE product_id='00000000-0000-4000-8000-000000013501') THEN RAISE EXCEPTION 'Pins outlived their product'; END IF;
END $$;
ROLLBACK;
