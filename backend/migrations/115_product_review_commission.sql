-- Partner product edits go back through review. Requires 001..112.
-- 1. products.pending_changes (jsonb) + pending_changes_at: a partner's edit to
--    a LIVE (approved) product's name or pack prices is held here for admin
--    review, the same way pending_image_url (091) holds a new photo. Customers
--    keep seeing the approved name and prices until a founder approves.
--    Shape: {"name"?, "price"?, "original_price"?, "unit"?, "variants"?: [...]}
--    where variants is the full pack list in save_catalogue_product's format.
-- 2. save_catalogue_product (latest: 111). New rules only for partner calls
--    (p_store not null); admin calls (p_store null) are unchanged:
--    - a partner never sets approval_status: a new product is always
--      'pending', and editing a 'rejected' product sends it back to 'pending'
--      (it was never live, so the edit itself applies directly);
--    - on an 'approved' product, a different name is queued instead of
--      written, and so is the pack list when ANY pack's price or MRP changes,
--      a pack is resized, or a new pack is added. Rule: every price edit to a
--      live product is reviewed (no threshold), so a customer never sees a
--      partner-set price an admin has not seen. Stock counts on existing packs
--      still apply live (stock is not reviewed), and so do all other fields.
--      Removing a pack with unchanged prices also applies live.
--    - a submission equal to the live value leaves an earlier queued change
--      alone (partner forms resend the live values on stock-only edits); a
--      different submission replaces it.
-- 3. review_product_changes(product, approve): approve applies the queued
--    change through save_catalogue_product as an admin save (packs matched by
--    id, so counted stock is kept), reject drops it. Either way the queue is
--    cleared. Returns false when nothing was queued.
-- Errors: P0400 invalid input, P0404 product not in scope, P0409 reserved pack.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pending_changes jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pending_changes_at timestamptz;
CREATE INDEX IF NOT EXISTS products_pending_changes_idx ON public.products(pending_changes_at) WHERE pending_changes IS NOT NULL;

CREATE OR REPLACE FUNCTION public.save_catalogue_product(p_product uuid,p_store uuid,p_fields jsonb,p_variants jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 pid uuid:=p_product; f jsonb:=coalesce(p_fields,'{}'::jsonb); k text; item jsonb; n integer; i integer; j integer;
 ids uuid[]; hit uuid; reserved text; counted integer; next_status text;
 cur products; live boolean:=false; pend jsonb; queued jsonb; queue_packs boolean:=false; first jsonb;
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

 -- A partner never approves its own listing.
 IF p_store IS NOT NULL THEN f:=f-'approval_status'; END IF;

 IF pid IS NULL THEN
  IF p_store IS NOT NULL THEN f:=f||'{"approval_status":"pending"}'; END IF;
  INSERT INTO products(store_id,name,unit,price,category) VALUES(coalesce(p_store,(f->>'store_id')::uuid),f->>'name',f->>'unit',(f->>'price')::numeric,f->>'category')
  RETURNING id INTO pid;
 ELSE
  SELECT * INTO cur FROM products WHERE id=pid AND (p_store IS NULL OR store_id=p_store) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Product not found'; END IF;
  IF p_store IS NOT NULL THEN
   -- A rejected product the partner fixes goes back into the review queue.
   IF cur.approval_status='rejected' THEN f:=f||'{"approval_status":"pending"}'; END IF;
   live:=cur.approval_status='approved';
  END IF;
 END IF;

 -- Live product, partner edit: hold a new name (and, below, new prices) for review.
 IF live THEN
  pend:=coalesce(cur.pending_changes,'{}'::jsonb);
  IF f ? 'name' THEN
   IF f->>'name' IS DISTINCT FROM cur.name THEN pend:=pend||jsonb_build_object('name',f->>'name'); END IF;
   f:=f-'name';
  END IF;
  IF p_variants IS NULL AND f ?| ARRAY['price','original_price','unit'] THEN
   IF (f ? 'price' AND (f->>'price')::numeric IS DISTINCT FROM cur.price)
   OR (f ? 'original_price' AND (f->>'original_price')::numeric IS DISTINCT FROM cur.original_price)
   OR (f ? 'unit' AND f->>'unit' IS DISTINCT FROM cur.unit) THEN
    pend:=pend||(SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(f) e WHERE e.key IN('price','original_price','unit'));
   END IF;
   f:=f-'price'-'original_price'-'unit';
  END IF;
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

  -- Live product, partner edit: any new pack or changed price/MRP/size is reviewed.
  IF live THEN
   FOR i IN 1..n LOOP
    item:=p_variants->(i-1);
    IF ids[i] IS NULL OR EXISTS(SELECT 1 FROM product_variants v WHERE v.id=ids[i] AND (
      v.price IS DISTINCT FROM (item->>'price')::numeric OR v.original_price IS DISTINCT FROM (item->>'original_price')::numeric
      OR v.unit_type IS DISTINCT FROM item->>'unit_type' OR v.quantity IS DISTINCT FROM (item->>'quantity')::numeric)) THEN
     queue_packs:=true; END IF;
   END LOOP;
  END IF;

  IF queue_packs THEN
   -- Queue the whole list; matched packs carry their id and no count (their
   -- count applies live just below), new packs keep the count they came with.
   SELECT jsonb_agg(CASE WHEN ids[x.o] IS NULL THEN x.e ELSE (x.e-'stock_quantity'-'id')||jsonb_build_object('id',ids[x.o]) END ORDER BY x.o)
    INTO queued FROM jsonb_array_elements(p_variants) WITH ORDINALITY x(e,o);
   first:=p_variants->0;
   pend:=pend||jsonb_build_object('variants',queued,
    'price',coalesce(f->'price',first->'price'),
    'original_price',coalesce(f->'original_price',first->'original_price','null'::jsonb),
    'unit',coalesce(f->'unit',to_jsonb(trim_scale((first->>'quantity')::numeric)::text||' '||CASE WHEN first->>'unit_type'='l' THEN 'L' ELSE first->>'unit_type' END)));
   -- The live row keeps its approved price/unit (the UPDATE above wrote them
   -- from f, so put them back) and every pack keeps its approved price.
   UPDATE products SET price=cur.price,original_price=cur.original_price,unit=cur.unit WHERE id=pid;
   FOR i IN 1..n LOOP
    item:=p_variants->(i-1);
    IF ids[i] IS NOT NULL AND jsonb_typeof(item->'stock_quantity')='number' THEN
     UPDATE product_variants SET stock_quantity=(item->>'stock_quantity')::integer WHERE id=ids[i]; END IF;
   END LOOP;
  ELSE
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
 END IF;

 IF live AND pend IS DISTINCT FROM coalesce(cur.pending_changes,'{}'::jsonb) THEN
  UPDATE products SET pending_changes=nullif(pend,'{}'::jsonb),pending_changes_at=now() WHERE id=pid;
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

CREATE OR REPLACE FUNCTION public.review_product_changes(p_product uuid,p_approve boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pend jsonb;
BEGIN
 IF p_product IS NULL OR p_approve IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Product and decision are required'; END IF;
 SELECT pending_changes INTO pend FROM products WHERE id=p_product FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0404',MESSAGE='Product not found'; END IF;
 IF pend IS NULL THEN RETURN false; END IF;
 IF p_approve THEN
  PERFORM save_catalogue_product(p_product,NULL,pend-'variants',CASE WHEN jsonb_typeof(pend->'variants')='array' THEN pend->'variants' END);
 END IF;
 UPDATE products SET pending_changes=NULL,pending_changes_at=NULL WHERE id=p_product;
 RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.review_product_changes(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_product_changes(uuid,boolean) TO service_role;

COMMIT;
