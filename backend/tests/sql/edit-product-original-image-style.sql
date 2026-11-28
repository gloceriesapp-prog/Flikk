-- Disposable image-queue fixture supplies the catalogue save stub below.
BEGIN;
DO $$
DECLARE pid uuid := '33333333-3333-4333-8333-333333333333';
 raw text := 'https://images.test/products/0f1a2b3c-0000-4000-8000-0000000a11c0/edit.webp';
 cut text := 'https://images.test/products/edit-cut.webp';
BEGIN
 INSERT INTO products(id,image_url) VALUES(pid,raw);
 INSERT INTO product_image_jobs(product_id,slot,original_url,result_url,status) VALUES(pid,'main',raw,cut,'done');
 UPDATE products SET image_url=cut WHERE id=pid;
 IF (SELECT image_url FROM products WHERE id=pid) <> raw THEN RAISE EXCEPTION 'Old worker overwrote None'; END IF;
 PERFORM save_catalogue_product_with_image_style(pid,NULL,jsonb_build_object('image_url',cut),NULL,'standard');
 IF (SELECT image_url FROM products WHERE id=pid) <> cut THEN RAISE EXCEPTION 'Explicit Standard restoration was blocked'; END IF;
 IF coalesce(current_setting('app.product_image_style_override',true),'') <> '' THEN RAISE EXCEPTION 'Override leaked after Admin save'; END IF;
 PERFORM save_catalogue_product_with_image_style(pid,NULL,jsonb_build_object('image_url',raw),NULL,'none');
 UPDATE products SET image_url=cut WHERE id=pid;
 IF (SELECT image_url FROM products WHERE id=pid) <> raw THEN RAISE EXCEPTION 'A later worker bypassed protection'; END IF;
 BEGIN
  PERFORM save_catalogue_product_with_image_style(pid,NULL,'{}',NULL,'invalid');
  RAISE EXCEPTION 'Invalid style accepted';
 EXCEPTION WHEN SQLSTATE 'P0400' THEN NULL;
 END;
 IF has_function_privilege('authenticated','public.save_catalogue_product_with_image_style(uuid,uuid,jsonb,jsonb,text)','EXECUTE') THEN RAISE EXCEPTION 'Non-Admin style override allowed'; END IF;
 IF NOT has_function_privilege('service_role','public.save_catalogue_product_with_image_style(uuid,uuid,jsonb,jsonb,text)','EXECUTE') THEN RAISE EXCEPTION 'Admin override unavailable'; END IF;
END $$;
ROLLBACK;
