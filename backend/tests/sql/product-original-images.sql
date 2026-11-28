-- Run after the product image queue migrations, in a disposable database.
BEGIN;
DO $$
DECLARE p uuid := '11111111-1111-4111-8111-111111111111';
        n uuid := '22222222-2222-4222-8222-222222222222';
        raw text := 'https://images.test/products/0f1a2b3c-0000-4000-8000-0000000a11c0/standard-source.webp';
        kept text := 'https://images.test/products/0f1a2b3c-0000-4000-8000-0000000a11c0/kept.webp';
        fit text := 'https://images.test/products/fitted.webp';
BEGIN
  INSERT INTO media_assets(public_url,source_url) VALUES(fit,raw);
  INSERT INTO products(id,image_url) VALUES(p,fit);
  IF (SELECT count(*) FROM product_image_jobs WHERE product_id=p AND status='queued' AND original_url=raw) <> 1 THEN
    RAISE EXCEPTION 'Standard uploads must still queue from their retained original'; END IF;
  UPDATE product_image_jobs SET status='processing' WHERE product_id=p;
  UPDATE products SET image_url=kept WHERE id=p;
  IF EXISTS(SELECT 1 FROM product_image_jobs WHERE product_id=p AND status IN ('queued','processing')) THEN
    RAISE EXCEPTION 'Choosing None must cancel the old in-flight main photo'; END IF;
  INSERT INTO products(id,image_url,extra_image_urls) VALUES(n,kept,ARRAY[kept]);
  IF EXISTS(SELECT 1 FROM product_image_jobs WHERE product_id=n) THEN
    RAISE EXCEPTION 'None main/gallery photos must not enter the cut-out queue'; END IF;
  IF replace_product_extra_image(n,ARRAY[kept],'https://images.test/products/worker-output.webp') THEN
    RAISE EXCEPTION 'A worker must never replace a None gallery photo'; END IF;
  IF (SELECT extra_image_urls FROM products WHERE id=n) <> ARRAY[kept] THEN
    RAISE EXCEPTION 'Original gallery composition was overwritten'; END IF;
  UPDATE products SET extra_image_urls=ARRAY['https://images.test/products/gallery.webp'] WHERE id=p;
  UPDATE product_image_jobs SET status='done', result_url='https://images.test/products/processed.webp' WHERE product_id=p AND slot='extra';
  IF NOT replace_product_extra_image(p,ARRAY['https://images.test/products/gallery.webp'],'https://images.test/products/processed.webp') THEN
    RAISE EXCEPTION 'Standard gallery photos must still accept their processed result'; END IF;
  IF (SELECT extra_image_urls FROM products WHERE id=p) <> ARRAY['https://images.test/products/processed.webp'] THEN
    RAISE EXCEPTION 'Standard gallery photo was not replaced in place'; END IF;
  -- An older batch worker records its result then directly updates the main URL.
  INSERT INTO product_image_jobs(product_id,slot,original_url,result_url,status)
    VALUES(n,'main',kept,'https://images.test/products/old-worker.webp','done');
  UPDATE products SET image_url='https://images.test/products/old-worker.webp' WHERE id=n;
  IF (SELECT image_url FROM products WHERE id=n) <> kept THEN
    RAISE EXCEPTION 'An older worker must not overwrite a None main photo'; END IF;
  -- None does not prevent an admin from uploading a different standard photo.
  UPDATE products SET image_url='https://images.test/products/replacement.webp' WHERE id=n;
  IF (SELECT image_url FROM products WHERE id=n) <> 'https://images.test/products/replacement.webp' THEN
    RAISE EXCEPTION 'Admin replacement must remain possible'; END IF;
  INSERT INTO product_premium_images(product_id,preset,status,url)
    VALUES(n,'studio','done','https://images.test/products/premium.webp');
  IF product_image_is_new('https://images.test/products/premium.webp') THEN
    RAISE EXCEPTION 'Premium photos must retain their existing queue exclusion'; END IF;
  UPDATE products SET image_url='https://images.test/products/premium.webp' WHERE id=n;
  IF EXISTS(SELECT 1 FROM product_image_jobs WHERE product_id=n AND status IN ('queued','processing')) THEN
    RAISE EXCEPTION 'Selecting Premium must not trigger cut-out processing'; END IF;
  IF NOT product_original_images_enabled() THEN RAISE EXCEPTION 'Feature probe must enable the UI'; END IF;
  IF has_function_privilege('anon','public.product_original_images_enabled()','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous clients must not get the Admin probe'; END IF;
  IF NOT has_function_privilege('service_role','public.product_original_images_enabled()','EXECUTE') THEN
    RAISE EXCEPTION 'Admin must be able to check readiness'; END IF;
END $$;
ROLLBACK;
