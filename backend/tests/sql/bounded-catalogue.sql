\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database() <> 'flikk_checkout_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
-- The isolated checkout fixture intentionally omits browse-only columns.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category_id uuid;
\i backend/migrations/072_bounded_collection_browse.sql
BEGIN;
INSERT INTO public.products(id,store_id,name,category,price,original_price,stock_status,approval_status)
SELECT ('72000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid,
 '72000000-0000-0000-0000-000000000999',
 CASE WHEN i <= 10 THEN 'Rice' ELSE 'Dal' END, 'Pantry',20,30,'in_stock','approved'
FROM generate_series(1,20) i;
INSERT INTO public.products(id,store_id,name,category,price,stock_status,approval_status) VALUES
('72000000-0000-0000-0000-000000000021','72000000-0000-0000-0000-000000000999','Rice','Pantry',20,'out_of_stock','approved'),
('72000000-0000-0000-0000-000000000022','72000000-0000-0000-0000-000000000999','Rice','Pantry',20,'in_stock','pending'),
('72000000-0000-0000-0000-000000000023','72000000-0000-0000-0000-000000000998','Rice','Pantry',20,'in_stock','approved');
DO $$ DECLARE rules jsonb; ids uuid[]; BEGIN
 rules := '[{"selection":{"includeTerms":["rice","dal"]},"limit":4}]';
 SELECT array_agg(id) INTO ids FROM public.browse_collection_ids('72000000-0000-0000-0000-000000000999',rules,NULL,true);
 IF cardinality(ids) <> 4 OR NOT ('72000000-0000-0000-0000-000000000011'::uuid = ANY(ids)) THEN RAISE EXCEPTION 'Preview not bounded and balanced'; END IF;
 rules := '[{"selection":{},"limit":6}]';
 SELECT array_agg(id) INTO ids FROM public.browse_collection_ids('72000000-0000-0000-0000-000000000999',rules,NULL,false);
 IF cardinality(ids) <> 6 THEN RAISE EXCEPTION 'First page not bounded'; END IF;
 SELECT array_agg(id) INTO ids FROM public.browse_collection_ids('72000000-0000-0000-0000-000000000999',rules,'72000000-0000-0000-0000-000000000006',false);
 IF cardinality(ids) <> 6 OR NOT ('72000000-0000-0000-0000-000000000007'::uuid = ANY(ids)) THEN RAISE EXCEPTION 'Cursor page incorrect'; END IF;
 rules := '[{"selection":{"includeTerms":["rice"],"excludeTerms":["rice"]},"limit":6}]';
 IF EXISTS (SELECT 1 FROM public.browse_collection_ids('72000000-0000-0000-0000-000000000999',rules,NULL,false)) THEN RAISE EXCEPTION 'Exclusions ignored'; END IF;
 rules := '[{"selection":{},"limit":61}]';
 SELECT array_agg(id) INTO ids FROM public.browse_collection_ids('72000000-0000-0000-0000-000000000999',rules,NULL,false);
 IF cardinality(ids) <> 20 THEN RAISE EXCEPTION 'Foreign, unapproved or unavailable product leaked'; END IF;
 IF has_function_privilege('authenticated','public.browse_collection_ids(uuid,jsonb,uuid,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Private browse RPC exposed'; END IF;
END $$;
ROLLBACK;
