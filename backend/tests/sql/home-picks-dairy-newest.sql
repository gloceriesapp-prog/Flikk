\set ON_ERROR_STOP on
-- Migration 20261028090000: Everyday Dairy takes picks; products.created_at.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000136a0','Dairy zone','dairy-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES('00000000-0000-4000-8000-0000000136d1','+919999136001','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000136f1','00000000-0000-4000-8000-0000000136d1','00000000-0000-4000-8000-0000000136a0','Dairy shop','grocery','Test',12.97,77.59);
INSERT INTO products(id,store_id,name,unit,price,category,approval_status) VALUES
 ('00000000-0000-4000-8000-000000013601','00000000-0000-4000-8000-0000000136f1','Nandini Milk','500 ml',27,'Dairy, Bread & Eggs','approved');
SET LOCAL session_replication_role=origin;
DO $$ BEGIN
 IF NOT home_section_accepts_products('everyday-dairy') THEN RAISE EXCEPTION 'Everyday Dairy does not take picks'; END IF;
 IF home_section_accepts_products('nearby-stores') THEN RAISE EXCEPTION 'Store rail takes picks'; END IF;
 PERFORM admin_set_home_section_products('everyday-dairy',ARRAY['00000000-0000-4000-8000-000000013601']::uuid[]);
 IF NOT EXISTS(SELECT 1 FROM home_pick_product_ids(ARRAY['00000000-0000-4000-8000-0000000136f1']::uuid[]) WHERE section_key='everyday-dairy')
  THEN RAISE EXCEPTION 'Dairy pick not served'; END IF;
 IF (SELECT created_at FROM products WHERE id='00000000-0000-4000-8000-000000013601') IS NULL THEN RAISE EXCEPTION 'New product has no created_at'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='products_approved_newest_idx') THEN RAISE EXCEPTION 'Newest index missing'; END IF;
END $$;
ROLLBACK;
