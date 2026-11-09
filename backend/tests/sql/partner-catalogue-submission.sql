\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() <> 'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF;
END $$;
BEGIN;

DO $$
DECLARE
  zone_id uuid := gen_random_uuid();
  owner_id uuid := gen_random_uuid();
  store_id uuid := gen_random_uuid();
  category_id uuid := gen_random_uuid();
  subcategory_id uuid := gen_random_uuid();
  item_id uuid := gen_random_uuid();
  assets uuid[] := ARRAY(SELECT gen_random_uuid() FROM generate_series(1, 6));
  urls text[];
  product_id uuid;
  product_row public.products;
  fields jsonb := '{"name":"Rice pack","unit":"1 kg","price":60,"stock_status":"in_stock","approval_status":"approved"}';
  sizes jsonb := '[{"unit_type":"kg","quantity":1,"price":60,"stock_quantity":8}]';
BEGIN
  IF has_function_privilege('anon','save_partner_catalogue_submission(uuid,jsonb,jsonb,uuid,uuid,uuid[])','EXECUTE')
     OR has_function_privilege('authenticated','save_partner_catalogue_submission(uuid,jsonb,jsonb,uuid,uuid,uuid[])','EXECUTE')
     OR NOT has_function_privilege('service_role','save_partner_catalogue_submission(uuid,jsonb,jsonb,uuid,uuid,uuid[])','EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected submission RPC privileges';
  END IF;

  SET LOCAL session_replication_role = replica;
  INSERT INTO public.zones (id,name,slug) VALUES (zone_id,'Submission fixture','submission-fixture');
  INSERT INTO public.users (id,phone,role,is_approved) VALUES (owner_id,'+919999971101','store_owner',true);
  INSERT INTO public.stores (id,owner_user_id,zone_id,name,category,district,lat,lng)
    VALUES (store_id,owner_id,zone_id,'Submission shop','grocery','Test',12.97,77.59);
  INSERT INTO public.categories (id,name) VALUES (category_id,'Staples');
  INSERT INTO public.sub_categories (id,category_id,name) VALUES (subcategory_id,category_id,'Rice');
  INSERT INTO public.catalogue_items (id,name,sub_category_id) VALUES (item_id,'Rice pack',subcategory_id);
  INSERT INTO public.media_assets (id,provider,bucket,object_key,public_url,purpose,content_type,byte_size,sha256,status)
  SELECT a,'r2','fixture',k,'https://images.example.test/'||k,'products','image/webp',32,repeat('a',64),'ready'
  FROM unnest(assets) AS a CROSS JOIN LATERAL (SELECT 'products/'||store_id||'/'||a||'.webp' AS k) AS key;
  SET LOCAL session_replication_role = origin;
  SET LOCAL ROLE service_role;

  urls := ARRAY(SELECT 'https://images.example.test/products/'||store_id||'/'||a||'.webp' FROM unnest(assets) AS a);
  BEGIN
    PERFORM public.save_partner_catalogue_submission(store_id,fields,sizes,subcategory_id,item_id,assets);
    RAISE EXCEPTION 'Accepted six photos';
  EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL;
  END;
  BEGIN
    PERFORM public.save_partner_catalogue_submission(store_id,fields,sizes,subcategory_id,item_id,ARRAY[assets[1],assets[1]]);
    RAISE EXCEPTION 'Accepted duplicate photos';
  EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL;
  END;
  BEGIN
    PERFORM public.save_partner_catalogue_submission(gen_random_uuid(),fields,sizes,subcategory_id,item_id,assets[1:1]);
    RAISE EXCEPTION 'Accepted another store photo';
  EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL;
  END;
  BEGIN
    PERFORM public.save_partner_catalogue_submission(store_id,fields||'{"name":"Wrong item"}',sizes,subcategory_id,item_id,assets[1:1]);
    RAISE EXCEPTION 'Accepted a mismatched catalogue suggestion';
  EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL;
  END;

  product_id := public.save_partner_catalogue_submission(store_id,fields,sizes,subcategory_id,item_id,assets[1:5]);
  SELECT * INTO STRICT product_row FROM public.products p WHERE p.id=product_id;
  IF product_row.approval_status <> 'pending' OR product_row.category <> 'Staples'
     OR product_row.sub_category_id IS DISTINCT FROM subcategory_id
     OR product_row.catalogue_item_id IS DISTINCT FROM item_id
     OR product_row.image_url IS DISTINCT FROM urls[1]
     OR product_row.extra_image_urls IS DISTINCT FROM urls[2:5]
     OR product_row.stock_quantity <> 8 THEN
    RAISE EXCEPTION 'Submission lost listing data or bypassed review';
  END IF;
  BEGIN
    PERFORM public.save_partner_catalogue_submission(store_id,fields,sizes,subcategory_id,item_id,assets[1:5]);
    RAISE EXCEPTION 'Accepted the same product twice';
  EXCEPTION WHEN SQLSTATE 'P0409' THEN NULL;
  END;

  product_id := public.save_partner_catalogue_submission(store_id,fields||'{"name":"Custom rice pack"}',sizes,subcategory_id,NULL,assets[6:6]);
  SELECT * INTO STRICT product_row FROM public.products p WHERE p.id=product_id;
  IF product_row.catalogue_item_id IS NOT NULL OR product_row.image_url IS DISTINCT FROM urls[6]
     OR product_row.extra_image_urls IS DISTINCT FROM ARRAY[]::text[] THEN
    RAISE EXCEPTION 'Single-photo manual submission did not persist correctly';
  END IF;
  RESET ROLE;
END $$;
ROLLBACK;
