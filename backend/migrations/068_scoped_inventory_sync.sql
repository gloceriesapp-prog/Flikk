-- One compact signal per store/transaction. No shared hot-store lock.
-- Triggers capture routing before deletes,
-- including cascade deletes, without a lookup per connected customer.
BEGIN;
CREATE TABLE IF NOT EXISTS public.inventory_signals (
  store_id uuid NOT NULL,
  transaction_id bigint NOT NULL DEFAULT txid_current(),
  zone_ids uuid[] NOT NULL DEFAULT '{}',
  store_changed boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, transaction_id)
);
CREATE INDEX IF NOT EXISTS inventory_signals_expiry ON public.inventory_signals(updated_at);
ALTER TABLE public.inventory_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_signals FROM anon, authenticated;
GRANT SELECT ON public.inventory_signals TO service_role;

CREATE OR REPLACE FUNCTION public.signal_store_inventory(p_store uuid, p_zones uuid[], p_changed boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.inventory_signals(store_id, zone_ids, store_changed)
  VALUES(p_store, array_remove(p_zones, NULL), p_changed)
  ON CONFLICT(store_id, transaction_id) DO UPDATE SET
    zone_ids = ARRAY(SELECT DISTINCT z FROM unnest(inventory_signals.zone_ids || EXCLUDED.zone_ids) z),
    store_changed = inventory_signals.store_changed OR EXCLUDED.store_changed,
    revision = inventory_signals.revision + 1, updated_at = now();
$$;
-- Bounded, index-backed cleanup. Multiple backend workers safely share it.
CREATE OR REPLACE FUNCTION public.prune_inventory_signals()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE removed integer;
BEGIN
  WITH expired AS (
    SELECT store_id, transaction_id FROM public.inventory_signals
    WHERE updated_at < now() - interval '5 minutes'
    ORDER BY updated_at LIMIT 5000 FOR UPDATE SKIP LOCKED
  ) DELETE FROM public.inventory_signals signals USING expired
    WHERE signals.store_id = expired.store_id AND signals.transaction_id = expired.transaction_id;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.prune_inventory_signals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_inventory_signals() TO service_role;

CREATE OR REPLACE FUNCTION public.capture_inventory_signal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_store uuid; new_store uuid; old_zone uuid; new_zone uuid;
BEGIN
  IF TG_TABLE_NAME = 'stores' THEN
    IF TG_OP <> 'INSERT' THEN old_store := OLD.id; old_zone := OLD.zone_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_store := NEW.id; new_zone := NEW.zone_id; END IF;
  ELSIF TG_TABLE_NAME = 'products' THEN
    IF TG_OP <> 'INSERT' THEN old_store := OLD.store_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_store := NEW.store_id; END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN SELECT store_id INTO old_store FROM public.products WHERE id = OLD.product_id; END IF;
    IF TG_OP <> 'DELETE' THEN SELECT store_id INTO new_store FROM public.products WHERE id = NEW.product_id; END IF;
    -- If the parent is already gone during a cascade, its own delete trigger
    -- emits the authoritative store signal.
  END IF;
  IF old_store IS NOT NULL THEN
    PERFORM public.signal_store_inventory(old_store, ARRAY[old_zone, new_zone], TG_TABLE_NAME = 'stores');
  END IF;
  IF new_store IS NOT NULL AND new_store IS DISTINCT FROM old_store THEN
    PERFORM public.signal_store_inventory(new_store, ARRAY[old_zone, new_zone], TG_TABLE_NAME = 'stores');
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.signal_store_inventory(uuid, uuid[], boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_inventory_signal() FROM PUBLIC;
DROP TRIGGER IF EXISTS scoped_inventory_signal ON public.products;
CREATE TRIGGER scoped_inventory_signal AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.capture_inventory_signal();
DROP TRIGGER IF EXISTS scoped_inventory_signal ON public.product_variants;
CREATE TRIGGER scoped_inventory_signal AFTER INSERT OR UPDATE OR DELETE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.capture_inventory_signal();
DROP TRIGGER IF EXISTS scoped_inventory_signal ON public.stores;
CREATE TRIGGER scoped_inventory_signal AFTER INSERT OR UPDATE OR DELETE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.capture_inventory_signal();
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inventory_signals') THEN
 ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_signals;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'zones') THEN
 ALTER PUBLICATION supabase_realtime ADD TABLE public.zones;
 END IF;
END $$;
COMMIT;
