-- Optional flavour-level counts, inside the existing product/pack stock limits.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
ALTER TABLE public.product_options ADD COLUMN stock_quantity integer
 CHECK (stock_quantity >= 0);
COMMENT ON COLUMN public.product_options.stock_quantity IS
 'Available packs for this flavour across all sizes; NULL inherits shared product stock. Product and pack limits still apply.';
GRANT SELECT(stock_quantity) ON public.product_options TO anon,authenticated;
ALTER TABLE public.inventory_reservations
 ADD COLUMN option_id uuid REFERENCES public.product_options(id) ON DELETE SET NULL,
 ADD COLUMN option_stock_reserved boolean NOT NULL DEFAULT false;
CREATE INDEX inventory_reservations_active_option_idx ON public.inventory_reservations(option_id)
 WHERE option_stock_reserved AND state IN('held','committed');

CREATE FUNCTION public.reserve_flavour_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE chosen uuid; opt public.product_options;
BEGIN
 SELECT option_id INTO chosen FROM public.order_items WHERE id=NEW.order_item_id AND product_id=NEW.product_id;
 NEW.option_id:=chosen;
 NEW.option_stock_reserved:=false;
 IF chosen IS NULL THEN RETURN NEW; END IF;
 -- Keep the same parent-first lock order as checkout and stock release.
 PERFORM 1 FROM public.products WHERE id=NEW.product_id FOR UPDATE;
 SELECT * INTO opt FROM public.product_options WHERE id=chosen AND product_id=NEW.product_id FOR UPDATE;
 IF NOT FOUND OR NOT opt.is_available THEN RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Flavour unavailable'; END IF;
 IF opt.stock_quantity IS NOT NULL THEN
  IF opt.stock_quantity<NEW.quantity THEN RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Insufficient flavour stock'; END IF;
  UPDATE public.product_options SET stock_quantity=stock_quantity-NEW.quantity WHERE id=chosen;
  NEW.option_stock_reserved:=true;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER inventory_reserve_flavour BEFORE INSERT ON public.inventory_reservations
 FOR EACH ROW EXECUTE FUNCTION public.reserve_flavour_stock();

CREATE FUNCTION public.release_flavour_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.state='released' AND OLD.state IN('held','committed') AND OLD.option_stock_reserved THEN
  UPDATE public.product_options SET stock_quantity=stock_quantity+OLD.quantity WHERE id=OLD.option_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER inventory_release_flavour AFTER UPDATE OF state ON public.inventory_reservations
 FOR EACH ROW EXECUTE FUNCTION public.release_flavour_stock();

CREATE FUNCTION public.protect_reserved_flavour() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF (TG_OP='DELETE' OR (OLD.stock_quantity IS NOT NULL AND NEW.stock_quantity IS NULL))
  AND EXISTS(SELECT 1 FROM public.inventory_reservations WHERE option_id=OLD.id AND option_stock_reserved AND state IN('held','committed')) THEN
  RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='This flavour has reserved stock. Complete or cancel its active orders before removing its stock count or deleting it.';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER product_options_protect_reserved BEFORE DELETE OR UPDATE OF stock_quantity ON public.product_options
 FOR EACH ROW EXECUTE FUNCTION public.protect_reserved_flavour();
CREATE TRIGGER scoped_inventory_signal AFTER INSERT OR UPDATE OR DELETE ON public.product_options
 FOR EACH ROW EXECUTE FUNCTION public.capture_inventory_signal();
REVOKE ALL ON FUNCTION public.reserve_flavour_stock(),public.release_flavour_stock(),public.protect_reserved_flavour() FROM PUBLIC,anon,authenticated;
-- Atomic option-list edits ensure a reserved-stock conflict cannot leave temporary names behind.
CREATE FUNCTION public.save_product_options(p_product uuid,p_options jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE item jsonb; keep_ids uuid[]; existing public.product_options; option_uuid uuid;
BEGIN
 IF jsonb_typeof(p_options) IS DISTINCT FROM 'array' OR jsonb_array_length(p_options)>20 THEN
  RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Invalid flavour list'; END IF;
 PERFORM 1 FROM public.products WHERE id=p_product FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='Product no longer exists'; END IF;
 SELECT coalesce(array_agg((value->>'id')::uuid) FILTER(WHERE value->>'id' IS NOT NULL),'{}') INTO keep_ids FROM jsonb_array_elements(p_options);
 IF EXISTS(SELECT 1 FROM unnest(keep_ids) AS selected(id) WHERE NOT EXISTS(SELECT 1 FROM public.product_options o WHERE o.id=selected.id AND o.product_id=p_product)) THEN
  RAISE EXCEPTION USING ERRCODE='P0409',MESSAGE='A flavour changed. Reload the product before saving.'; END IF;
 IF cardinality(keep_ids)<>(SELECT count(DISTINCT id) FROM unnest(keep_ids) AS selected(id)) THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='Duplicate flavour IDs'; END IF;
 DELETE FROM public.product_options WHERE product_id=p_product AND NOT(id=ANY(keep_ids));
 UPDATE public.product_options SET name='~'||id::text WHERE product_id=p_product AND id=ANY(keep_ids);
 FOR item IN SELECT * FROM jsonb_array_elements(p_options) LOOP
  option_uuid:=(item->>'id')::uuid;
  SELECT * INTO existing FROM public.product_options WHERE id=option_uuid AND product_id=p_product;
  INSERT INTO public.product_options(id,product_id,name,image_url,extra_image_urls,price_overrides,stock_quantity,is_available,sort_order)
  VALUES(coalesce(option_uuid,gen_random_uuid()),p_product,item->>'name',CASE WHEN item ? 'image_url' THEN item->>'image_url' ELSE existing.image_url END,
   CASE WHEN item ? 'extra_image_urls' THEN ARRAY(SELECT jsonb_array_elements_text(item->'extra_image_urls')) ELSE coalesce(existing.extra_image_urls,'{}') END,
   CASE WHEN item ? 'price_overrides' THEN item->'price_overrides' ELSE coalesce(existing.price_overrides,'{}'::jsonb) END,
   CASE WHEN item ? 'stock_quantity' THEN (item->>'stock_quantity')::integer ELSE existing.stock_quantity END,
   coalesce((item->>'is_available')::boolean,true),coalesce((item->>'sort_order')::integer,0))
  ON CONFLICT(id) DO UPDATE SET name=excluded.name,image_url=excluded.image_url,extra_image_urls=excluded.extra_image_urls,
   price_overrides=excluded.price_overrides,stock_quantity=excluded.stock_quantity,is_available=excluded.is_available,sort_order=excluded.sort_order;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.save_product_options(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_product_options(uuid,jsonb) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
