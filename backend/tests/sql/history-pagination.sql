\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database() <> 'flikk_checkout_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS name text;
CREATE TABLE IF NOT EXISTS public.payouts(id uuid PRIMARY KEY,store_id uuid,week_start date,week_end date);
CREATE TABLE IF NOT EXISTS public.reviews(id uuid PRIMARY KEY,store_id uuid,created_at timestamptz);
CREATE TABLE IF NOT EXISTS public.rider_payouts(id uuid PRIMARY KEY,rider_id uuid,week_start date);
CREATE TABLE IF NOT EXISTS public.rider_earnings(id uuid PRIMARY KEY,rider_id uuid,order_id uuid,trip_id uuid,amount numeric);
\i backend/migrations/073_history_query_indexes.sql
BEGIN;
-- These fixture writes only exercise reads; disable checkout/notification
-- side effects for deliberately incomplete historical fixture rows.
ALTER TABLE public.orders DISABLE TRIGGER USER;
INSERT INTO public.trips(id,customer_id,status,created_at) VALUES
('73000000-0000-0000-0000-000000000010','73000000-0000-0000-0000-000000000001','placed','2026-10-01T12:00:00Z');
INSERT INTO public.orders(id,customer_id,trip_id,status,placed_at) VALUES
('73000000-0000-0000-0000-000000000011','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000010','out_for_delivery','2026-10-01T12:00:00Z'),
('73000000-0000-0000-0000-000000000012','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000010','out_for_delivery','2026-10-01T12:00:00Z'),
('73000000-0000-0000-0000-000000000020','73000000-0000-0000-0000-000000000001',NULL,'delivered','2026-10-01T12:00:00Z'),
('73000000-0000-0000-0000-000000000021','73000000-0000-0000-0000-000000000002',NULL,'delivered','2026-10-01T12:00:00Z');
UPDATE public.orders SET delivered_at='2026-10-01T12:10:00Z' WHERE id='73000000-0000-0000-0000-000000000020';
INSERT INTO public.rider_earnings(id,rider_id,order_id,amount,earned_at) VALUES
('73000000-0000-0000-0000-000000000030','73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000020',100,'2026-10-01T12:10:00Z'),
('73000000-0000-0000-0000-000000000031','73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000020',150,'2026-10-01T12:20:00Z'),
('73000000-0000-0000-0000-000000000032','73000000-0000-0000-0000-000000000004','73000000-0000-0000-0000-000000000020',900,'2026-10-01T12:20:00Z');
DO $$ DECLARE heads record; found int; BEGIN
 SELECT * INTO heads FROM public.customer_purchase_page('73000000-0000-0000-0000-000000000001',1);
 IF heads.entity_id <> '73000000-0000-0000-0000-000000000020' THEN RAISE EXCEPTION 'Tie-breaker or customer scope failed'; END IF;
 SELECT count(*) INTO found FROM public.customer_purchase_page('73000000-0000-0000-0000-000000000001',1,heads.placed_at,heads.entity_id,heads.is_trip);
 IF found <> 1 THEN RAISE EXCEPTION 'Next-page cursor failed'; END IF;
 SELECT count(*) INTO found FROM public.customer_purchase_page('73000000-0000-0000-0000-000000000001',20,NULL,NULL,NULL,'out_for_delivery');
 IF found <> 1 THEN RAISE EXCEPTION 'Trip live status was not derived from its legs'; END IF;
 SELECT count(*) INTO found FROM public.customer_purchase_page('73000000-0000-0000-0000-000000000001',20);
 IF found <> 2 THEN RAISE EXCEPTION 'Purchase trip duplicated or foreign account leaked'; END IF;
 IF (SELECT total FROM public.rider_earning_totals('73000000-0000-0000-0000-000000000003','2026-10-01T00:00:00+05:30','2026-10-02T00:00:00+05:30')) <> 250 THEN RAISE EXCEPTION 'Whole-period earnings totals or rider scope failed'; END IF;
 IF has_function_privilege('authenticated','public.customer_purchase_page(uuid,int,timestamptz,uuid,boolean,text,timestamptz,timestamptz,text)','EXECUTE') THEN RAISE EXCEPTION 'Private history RPC exposed'; END IF;
END $$;
ROLLBACK;
