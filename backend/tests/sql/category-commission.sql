\set ON_ERROR_STOP on
-- Migration 20261026120000: commission by product category, the flat 6%
-- default retired, and a per-order cap.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_table_privilege('anon','public.category_commission_rates','SELECT')
 OR has_table_privilege('authenticated','public.category_commission_rates','SELECT') THEN RAISE EXCEPTION 'Commission rates readable by API roles'; END IF;
 IF (SELECT commission_rate FROM category_commission_rates WHERE category='Dairy, Bread & Eggs')<>0 THEN RAISE EXCEPTION 'Dairy is not 0%%'; END IF;
 IF (SELECT commission_rate FROM category_commission_rates WHERE category='Meat, Eggs & Fish')<>0.02 THEN RAISE EXCEPTION 'Meat is not 2%%'; END IF;
 IF (SELECT count(*) FROM category_commission_rates)<>13 THEN RAISE EXCEPTION 'Not every product category has a starting rate'; END IF;
 IF EXISTS(SELECT 1 FROM platform_settings WHERE commission_rate=0.06) THEN RAISE EXCEPTION 'Flat 6%% default still set'; END IF;
 IF EXISTS(SELECT 1 FROM platform_settings WHERE commission_cap_per_order IS DISTINCT FROM 30) THEN RAISE EXCEPTION 'Cap per order not 30'; END IF;
 BEGIN INSERT INTO category_commission_rates(category,commission_rate) VALUES('Too much',1.5); RAISE EXCEPTION 'Rate above 100%% accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE platform_settings SET commission_cap_per_order=-1; RAISE EXCEPTION 'Negative cap accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
