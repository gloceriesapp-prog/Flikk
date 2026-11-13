-- Optional store price/MRP overrides per flavour and pack. Empty means inherit.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE OR REPLACE FUNCTION public.valid_flavour_prices(prices jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE entry record; amount numeric; mrp numeric;
BEGIN
 IF jsonb_typeof(prices) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF (SELECT count(*) FROM jsonb_each(prices)) > 32 THEN RETURN false; END IF;
 FOR entry IN SELECT * FROM jsonb_each(prices) LOOP
  IF entry.key !~ '^(base|(g|kg|ml|l|pc):[0-9]+(\.[0-9]+)?)$' OR jsonb_typeof(entry.value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF entry.key <> 'base' AND split_part(entry.key, ':', 2)::numeric <= 0 THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(entry.value) k WHERE k NOT IN ('price','original_price')) THEN RETURN false; END IF;
  IF jsonb_typeof(entry.value->'price') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
  amount := (entry.value->>'price')::numeric;
  IF amount <= 0 OR amount > 1000000 OR round(amount,2) <> amount THEN RETURN false; END IF;
  IF entry.value ? 'original_price' THEN
   IF jsonb_typeof(entry.value->'original_price') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
   mrp := (entry.value->>'original_price')::numeric;
   IF mrp < amount OR mrp > 1000000 OR round(mrp,2) <> mrp THEN RETURN false; END IF;
  END IF;
 END LOOP;
 RETURN true;
END $$;
ALTER TABLE public.product_options ADD COLUMN price_overrides jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (public.valid_flavour_prices(price_overrides));
-- Customer feeds are service-role API reads and return calculated customer_prices.
-- Retain public access to existing fields without exposing store-price overrides.
REVOKE SELECT ON public.product_options FROM anon, authenticated;
GRANT SELECT (id, product_id, name, image_url, sort_order, is_available, created_at, extra_image_urls)
 ON public.product_options TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.snapshot_order_item_variant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
declare
  product public.products;
  variant public.product_variants;
  store_price numeric;
  price numeric;
  mrp numeric;
  pack text;
  seller uuid;
  opt public.product_options;
  override jsonb;
  pack_key text;
  base_mrp numeric;
begin
  select * into product from public.products where id = new.product_id for update;
  if not found or not product.is_in_stock or product.stock_status='out_of_stock' or product.approval_status is distinct from 'approved' then
    raise exception 'Product unavailable';
  end if;
  select store_id into seller from public.orders where id = new.order_id;
  if seller is distinct from product.store_id then raise exception 'Product does not belong to the order store'; end if;
  if new.variant_id is not null then
    select * into variant from public.product_variants
      where id = new.variant_id and product_id = new.product_id for share;
    if not found then raise exception 'Variant unavailable'; end if;
    store_price := variant.price;
    price := public.customer_unit_price(variant.price, variant.platform_markup, variant.original_price);
    mrp := greatest(price, coalesce(variant.original_price, price));
    pack := trim_scale(variant.quantity::numeric)::text || ' ' || case when variant.unit_type = 'l' then 'L' else variant.unit_type::text end;
  else
    -- Products without packs carry no markup.
    store_price := product.price;
    price := product.price;
    mrp := greatest(price, coalesce(product.original_price, price));
    pack := coalesce(product.unit, '');
  end if;
  -- Added flavours must belong to this product and be in stock.
  -- A null option_id is the original product, not a missing selection.
  if new.option_id is not null then
    select * into opt from public.product_options where id = new.option_id and product_id = new.product_id for share;
    if not found or not opt.is_available then
      raise exception using errcode = '40001', message = 'Flavour unavailable';
    end if;
    pack_key := case when new.variant_id is null then 'base' else variant.unit_type::text || ':' || trim_scale(variant.quantity::numeric)::text end;
    override := opt.price_overrides -> pack_key;
    if override is not null then
      store_price := (override->>'price')::numeric;
      base_mrp := coalesce((override->>'original_price')::numeric, case when new.variant_id is null then product.original_price else variant.original_price end);
      price := case when new.variant_id is null then store_price else public.customer_unit_price(store_price, variant.platform_markup, base_mrp) end;
      mrp := greatest(price, coalesce(base_mrp, price));
    end if;
    new.option_name_at_order := opt.name;
  else
    new.option_name_at_order := null;
  end if;
  if new.unit_price_at_order is distinct from price
     or (new.unit_at_order is not null and new.unit_at_order is distinct from pack) then
    raise exception using errcode = '40001', message = 'Pack changed during checkout';
  end if;
  -- Serving: one offered = applied; two offered = customer must pick one.
  if coalesce(cardinality(product.serving_options), 0) = 0 then
    if new.serving is not null then
      raise exception using errcode = '40001', message = 'Serving option unavailable';
    end if;
  elsif new.serving is null and cardinality(product.serving_options) = 1 then
    new.serving := product.serving_options[1];
  elsif new.serving is null then
    raise exception using errcode = '40001', message = 'Choose chilled or room temperature';
  elsif not (new.serving = any(product.serving_options)) then
    raise exception using errcode = '40001', message = 'Serving option unavailable';
  end if;
  new.unit_price_at_order := price;
  new.store_unit_price_at_order := store_price;
  new.unit_at_order := pack;
  new.variant_mrp_at_order := mrp;
  return new;
end $$;
REVOKE ALL ON FUNCTION public.snapshot_order_item_variant() FROM PUBLIC, anon, authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
