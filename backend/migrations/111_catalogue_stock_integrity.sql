-- Catalogue edits keep counted pack stock. Requires 001..107.
-- save_catalogue_product(product, store, fields, variants) is the one write
-- path for a product row and its packs (backend partner/admin routes and the
-- admin dashboard's /api/products). One transaction, product row locked:
-- 1. fields (jsonb) is a PARTIAL update: only keys present are written, so a
--    partner edit never nulls admin metadata it did not send. A null product
--    id creates the product instead (store_id/name/unit/price/category needed).
-- 2. variants (jsonb array, or null to leave packs untouched) is diffed, never
--    delete+reinsert: an item matches an existing pack by its id, else by
--    (unit_type, quantity). Matched packs update price/label/default in place
--    and keep stock_quantity unless the item carries one; new items insert;
--    only packs missing from the list are deleted. Removing a pack an active
--    order reserves is refused (SQLSTATE P0409) before anything is written.
-- 3. When any pack carries a count, products.stock_quantity/stock_status are
--    recomputed with set_product_pack_stock's rule (sum of pack counts) and
--    stock tracking is enabled, so the product can be ordered.
-- p_store scopes the call to one store (partner); null means admin.
-- Errors: P0400 invalid input, P0404 product not in scope, P0409 reserved pack.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE OR REPLACE FUNCTION public.save_catalogue_product(p_product uuid,p_store uuid,p_fields jsonb,p_variants jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 pid uuid:=p_product; f jsonb:=coalesce(p_fields,'{}'::jsonb); k text; item jsonb; n integer; i integer; j integer;
 ids uuid[]; hit uuid; reserved text; counted integer; next_status text;
 allowed constant text[]:=ARRAY['store_id','name','unit','price','original_price','category','stock_status','image_url','pending_image_url',
  'bg_color','local_name','is_veg','freshness_tag','description','sub_category_id','approval_status','stock_quantity','stock_tracking_enabled','brand_name'];
BEGIN
 IF jsonb_typeof(f)<>'object' THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Product fields must be an object'; END IF;
 FOR k IN SELECT jsonb_object_keys(f) LOOP
  IF NOT k=ANY(allowed) THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Unknown product field '||k; END IF;
 END LOOP;
 IF p_store IS NOT NULL AND f ? 'store_id' AND (f->>'store_id')::uuid IS DISTINCT FROM p_store THEN
  RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Product not found'; END IF;
 IF p_variants IS NOT NULL THEN
  IF jsonb_typeof(p_variants)<>'array' OR jsonb_array_length(p_variants)=0 THEN
   RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='At least one size is required'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_variants) LOOP
   IF jsonb_typeof(item)<>'object' OR coalesce(item->>'unit_type','') NOT IN('g','kg','ml','l','pc')
   OR jsonb_typeof(item->'quantity')<>'number' OR (item->>'quantity')::numeric<=0
   OR jsonb_typeof(item->'price')<>'number' OR (item->>'price')::numeric<0
   OR (item ? 'stock_quantity' AND jsonb_typeof(item->'stock_quantity') NOT IN('null','number'))
   OR (jsonb_typeof(item->'stock_quantity')='number' AND ((item->>'stock_quantity')::numeric<0 OR (item->>'stock_quantity')::numeric<>trunc((item->>'stock_quantity')::numeric))) THEN
    RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid pack size, price or stock count'; END IF;
  END LOOP;
  IF (SELECT count(*)<>count(DISTINCT (e->>'unit_type',(e->>'quantity')::numeric)) FROM jsonb_array_elements(p_variants) e) THEN
   RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Each pack size can only be listed once'; END IF;
 ELSIF pid IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='At least one size is required';
 END IF;

 IF pid IS NULL THEN
  INSERT INTO products(store_id,name,unit,price,category) VALUES(coalesce(p_store,(f->>'store_id')::uuid),f->>'name',f->>'unit',(f->>'price')::numeric,f->>'category')
  RETURNING id INTO pid;
 ELSE
  PERFORM 1 FROM products WHERE id=pid AND (p_store IS NULL OR store_id=p_store) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Product not found'; END IF;
 END IF;

 UPDATE products SET
  store_id=CASE WHEN f ? 'store_id' THEN (f->>'store_id')::uuid ELSE store_id END,
  name=CASE WHEN f ? 'name' THEN f->>'name' ELSE name END,
  unit=CASE WHEN f ? 'unit' THEN f->>'unit' ELSE unit END,
  price=CASE WHEN f ? 'price' THEN (f->>'price')::numeric ELSE price END,
  original_price=CASE WHEN f ? 'original_price' THEN (f->>'original_price')::numeric ELSE original_price END,
  category=CASE WHEN f ? 'category' THEN f->>'category' ELSE category END,
  stock_status=CASE WHEN f ? 'stock_status' THEN f->>'stock_status' ELSE stock_status END,
  image_url=CASE WHEN f ? 'image_url' THEN f->>'image_url' ELSE image_url END,
  pending_image_url=CASE WHEN f ? 'pending_image_url' THEN f->>'pending_image_url' ELSE pending_image_url END,
  bg_color=CASE WHEN f ? 'bg_color' THEN f->>'bg_color' ELSE bg_color END,
  local_name=CASE WHEN f ? 'local_name' THEN f->>'local_name' ELSE local_name END,
  is_veg=CASE WHEN f ? 'is_veg' THEN (f->>'is_veg')::boolean ELSE is_veg END,
  freshness_tag=CASE WHEN f ? 'freshness_tag' THEN f->>'freshness_tag' ELSE freshness_tag END,
  description=CASE WHEN f ? 'description' THEN f->>'description' ELSE description END,
  sub_category_id=CASE WHEN f ? 'sub_category_id' THEN (f->>'sub_category_id')::uuid ELSE sub_category_id END,
  approval_status=CASE WHEN f ? 'approval_status' THEN f->>'approval_status' ELSE approval_status END,
  brand_name=CASE WHEN f ? 'brand_name' THEN f->>'brand_name' ELSE brand_name END,
  stock_quantity=CASE WHEN f ? 'stock_quantity' THEN (f->>'stock_quantity')::integer ELSE stock_quantity END,
  stock_tracking_enabled=CASE WHEN f ? 'stock_tracking_enabled' THEN (f->>'stock_tracking_enabled')::boolean ELSE stock_tracking_enabled END
 WHERE id=pid;

 IF p_variants IS NOT NULL THEN
  PERFORM 1 FROM product_variants WHERE product_id=pid ORDER BY id FOR UPDATE;
  n:=jsonb_array_length(p_variants);
  ids:=array_fill(NULL::uuid,ARRAY[n]);
  -- Pass 1: explicit ids that really belong to this product.
  FOR i IN 1..n LOOP
   item:=p_variants->(i-1);
   IF coalesce(item->>'id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT v.id INTO hit FROM product_variants v WHERE v.id=(item->>'id')::uuid AND v.product_id=pid AND NOT v.id=ANY(array_remove(ids,NULL));
    ids[i]:=hit;
   END IF;
  END LOOP;
  -- Pass 2: the remaining items match an unclaimed pack of the same size.
  FOR i IN 1..n LOOP
   CONTINUE WHEN ids[i] IS NOT NULL;
   item:=p_variants->(i-1);
   SELECT v.id INTO hit FROM product_variants v WHERE v.product_id=pid AND v.unit_type=item->>'unit_type' AND v.quantity=(item->>'quantity')::numeric
    AND NOT v.id=ANY(array_remove(ids,NULL)) ORDER BY v.is_default DESC,v.created_at,v.id LIMIT 1;
   ids[i]:=hit;
  END LOOP;
  SELECT trim_scale(v.quantity)::text||' '||CASE WHEN v.unit_type='l' THEN 'L' ELSE v.unit_type END INTO reserved
   FROM product_variants v WHERE v.product_id=pid AND NOT v.id=ANY(array_remove(ids,NULL))
   AND EXISTS(SELECT 1 FROM inventory_reservations r WHERE r.variant_id=v.id AND r.state IN('held','committed')) LIMIT 1;
  IF reserved IS NOT NULL THEN
   RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='The '||reserved||' pack is reserved by an active order and cannot be removed'; END IF;
  DELETE FROM product_variants v WHERE v.product_id=pid AND NOT v.id=ANY(array_remove(ids,NULL));
  FOR i IN 1..n LOOP
   item:=p_variants->(i-1);
   IF ids[i] IS NOT NULL THEN
    UPDATE product_variants SET unit_type=item->>'unit_type',quantity=(item->>'quantity')::numeric,price=(item->>'price')::numeric,
     original_price=(item->>'original_price')::numeric,is_default=(i=1),
     stock_quantity=CASE WHEN jsonb_typeof(item->'stock_quantity')='number' THEN (item->>'stock_quantity')::integer ELSE stock_quantity END
    WHERE id=ids[i];
   ELSE
    INSERT INTO product_variants(product_id,unit_type,quantity,price,original_price,is_default,stock_quantity)
    VALUES(pid,item->>'unit_type',(item->>'quantity')::numeric,(item->>'price')::numeric,(item->>'original_price')::numeric,i=1,
     CASE WHEN jsonb_typeof(item->'stock_quantity')='number' THEN (item->>'stock_quantity')::integer END);
   END IF;
  END LOOP;
 END IF;

 -- Same rollup as set_product_pack_stock: counted packs are the product's stock.
 IF EXISTS(SELECT 1 FROM product_variants WHERE product_id=pid AND stock_quantity IS NOT NULL) THEN
  SELECT coalesce(sum(stock_quantity),0)::integer INTO counted FROM product_variants WHERE product_id=pid;
  IF counted=0 THEN next_status:='out_of_stock'; ELSIF counted<=10 THEN next_status:='low_stock'; ELSE next_status:='in_stock'; END IF;
  UPDATE products SET stock_tracking_enabled=true,stock_quantity=counted,stock_status=next_status,is_in_stock=counted>0 WHERE id=pid;
 END IF;
 RETURN pid;
EXCEPTION
 WHEN invalid_text_representation OR not_null_violation OR check_violation OR foreign_key_violation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid product: '||SQLERRM;
END $$;

REVOKE ALL ON FUNCTION public.save_catalogue_product(uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_catalogue_product(uuid,uuid,jsonb,jsonb) TO service_role;

COMMIT;
