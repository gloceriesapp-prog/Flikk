\set ON_ERROR_STOP on
-- Migrations 20261106130000/20261106140000: a pack saved with no store price
-- (0) and an MRP sells at its MRP; with neither it is refused.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000191a0','Price zone','price-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES('00000000-0000-4000-8000-0000000191d1','+919999191001','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000191f1','00000000-0000-4000-8000-0000000191d1','00000000-0000-4000-8000-0000000191a0','Price shop','grocery','Test',12.97,77.59);
SET LOCAL session_replication_role=origin;
DO $$
DECLARE p products; v product_variants;
BEGIN
 INSERT INTO products(store_id,name,unit,price,original_price,category)
  VALUES('00000000-0000-4000-8000-0000000191f1','Milk','180 ml',0,10,'Dairy') RETURNING * INTO p;
 IF p.price<>10 OR p.original_price IS NOT NULL THEN RAISE EXCEPTION 'Product without store price should sell at MRP, got % / %',p.price,p.original_price; END IF;
 INSERT INTO product_variants(product_id,unit_type,quantity,price,original_price,is_default)
  VALUES(p.id,'ml',180,0,10,true) RETURNING * INTO v;
 IF v.price<>10 OR v.original_price IS NOT NULL THEN RAISE EXCEPTION 'Pack without store price should sell at MRP'; END IF;
 UPDATE product_variants SET price=8, original_price=10 WHERE id=v.id RETURNING * INTO v;
 IF v.price<>8 OR v.original_price<>10 THEN RAISE EXCEPTION 'A real discount must keep its MRP'; END IF;
 UPDATE product_variants SET price=10, original_price=10 WHERE id=v.id RETURNING * INTO v;
 IF v.original_price<>10 THEN RAISE EXCEPTION 'MRP equal to price must be kept (it caps the markup)'; END IF;
 BEGIN
  INSERT INTO products(store_id,name,unit,price,category) VALUES('00000000-0000-4000-8000-0000000191f1','Free','1 pc',0,'Dairy');
  RAISE EXCEPTION 'A product with no price was saved';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
