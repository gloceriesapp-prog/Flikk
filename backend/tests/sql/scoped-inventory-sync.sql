\set ON_ERROR_STOP on
-- Run after migration 068 against a disposable fixture. All sample writes roll back.
BEGIN;
INSERT INTO public.stores(id, zone_id, is_active) VALUES
('68000000-0000-0000-0000-000000000001', '68000000-0000-0000-0000-000000000010', true),
('68000000-0000-0000-0000-000000000002', '68000000-0000-0000-0000-000000000020', true);
INSERT INTO public.products(id, store_id, price, unit) VALUES
('68000000-0000-0000-0000-000000000003', '68000000-0000-0000-0000-000000000001', 20, 'kg');
INSERT INTO public.product_variants(id, product_id, price) VALUES
('68000000-0000-0000-0000-000000000004', '68000000-0000-0000-0000-000000000003', 30);
DELETE FROM public.inventory_signals WHERE store_id IN ('68000000-0000-0000-0000-000000000001', '68000000-0000-0000-0000-000000000002');
DO $$ DECLARE previous bigint; BEGIN
 SELECT coalesce(max(revision), 0) INTO previous FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000001';
 UPDATE public.product_variants SET price = 40 WHERE id = '68000000-0000-0000-0000-000000000004';
 IF NOT EXISTS(SELECT 1 FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000001' AND revision = previous + 1 AND NOT store_changed) THEN RAISE EXCEPTION 'Variant price signal missing'; END IF;
 DELETE FROM public.product_variants WHERE id = '68000000-0000-0000-0000-000000000004';
 IF NOT EXISTS(SELECT 1 FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000001' AND revision = previous + 2) THEN RAISE EXCEPTION 'Variant deletion signal missing'; END IF;
 UPDATE public.products SET store_id = '68000000-0000-0000-0000-000000000002' WHERE id = '68000000-0000-0000-0000-000000000003';
 IF NOT EXISTS(SELECT 1 FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000001' AND revision = previous + 3) THEN RAISE EXCEPTION 'Old store move signal missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000002' AND NOT store_changed) THEN RAISE EXCEPTION 'New store move signal missing'; END IF;
 UPDATE public.stores SET zone_id = '68000000-0000-0000-0000-000000000010' WHERE id = '68000000-0000-0000-0000-000000000002';
 IF NOT EXISTS(SELECT 1 FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000002' AND store_changed AND zone_ids @> ARRAY['68000000-0000-0000-0000-000000000010'::uuid, '68000000-0000-0000-0000-000000000020'::uuid]) THEN RAISE EXCEPTION 'Both move zones must be notified'; END IF;
 DELETE FROM public.products WHERE id = '68000000-0000-0000-0000-000000000003';
 DELETE FROM public.stores WHERE id = '68000000-0000-0000-0000-000000000002';
 IF NOT EXISTS(SELECT 1 FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000002' AND store_changed) THEN RAISE EXCEPTION 'Deleted store routing lost'; END IF;
END $$;
-- A rolled-back transaction must not publish a new signal revision.
CREATE TEMP TABLE signal_before_rollback ON COMMIT DROP AS SELECT revision FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000001';
SAVEPOINT inventory_rollback;
UPDATE public.stores SET is_active = false WHERE id = '68000000-0000-0000-0000-000000000001';
ROLLBACK TO inventory_rollback;
DO $$ BEGIN
 IF (SELECT revision FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000001') <> (SELECT revision FROM signal_before_rollback) THEN RAISE EXCEPTION 'Rolled back inventory change must not emit a revision'; END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'inventory_signals') THEN RAISE EXCEPTION 'Customer access must not be granted'; END IF;
END $$;
INSERT INTO public.inventory_signals(store_id, updated_at) VALUES ('68000000-0000-0000-0000-000000000099', now() - interval '10 minutes');
SELECT public.prune_inventory_signals();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.inventory_signals WHERE store_id = '68000000-0000-0000-0000-000000000099') THEN RAISE EXCEPTION 'Expired signals were not cleaned'; END IF;
END $$;
ROLLBACK;
