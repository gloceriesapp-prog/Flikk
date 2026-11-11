-- Keep the original product purchasable alongside its additional flavours.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
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
  if new.unit_price_at_order is distinct from price
     or (new.unit_at_order is not null and new.unit_at_order is distinct from pack) then
    raise exception using errcode = '40001', message = 'Pack changed during checkout';
  end if;
  -- Added flavours must belong to this product and be in stock.
  -- A null option_id is the original product, not a missing selection.
  if new.option_id is not null then
    select * into opt from public.product_options where id = new.option_id and product_id = new.product_id;
    if not found or not opt.is_available then
      raise exception using errcode = '40001', message = 'Flavour unavailable';
    end if;
    new.option_name_at_order := opt.name;
  else
    new.option_name_at_order := null;
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
