\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_checkout_tests' THEN RAISE EXCEPTION 'Isolated fixture only'; END IF; END $$;
BEGIN;
ALTER TABLE public.stores DISABLE TRIGGER USER;
ALTER TABLE public.orders DISABLE TRIGGER USER;
ALTER TABLE public.order_items DISABLE TRIGGER USER;
ALTER TABLE public.stores ADD COLUMN payout_method text,ADD COLUMN razorpay_fund_account_id text;
ALTER TABLE public.orders ADD COLUMN dispatch_radius_m integer,ADD COLUMN dispatch_broadcast_at timestamptz;
ALTER TABLE public.payouts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.payouts ADD COLUMN gross_amount numeric,ADD COLUMN commission_deducted numeric,ADD COLUMN net_payout numeric,
 ADD COLUMN status text DEFAULT 'pending',ADD COLUMN paid_at timestamptz,ADD COLUMN razorpay_payout_id text;
CREATE UNIQUE INDEX fixture_payout_week ON public.payouts(store_id,week_start);
ALTER TABLE public.rider_payouts ADD COLUMN status text,ADD COLUMN amount numeric,ADD COLUMN paid_at timestamptz,ADD COLUMN razorpay_payout_id text;
CREATE TABLE public.riders(user_id uuid,payout_method text,razorpay_fund_account_id text);
ALTER TABLE public.rider_earnings ADD COLUMN rider_payout_id uuid,ADD COLUMN paid_at timestamptz;
\i backend/migrations/075_durable_background_workers.sql
\i backend/migrations/076_prompt_reservation_expiry.sql
\i backend/migrations/077_capacity_observability.sql
CREATE OR REPLACE FUNCTION public.checkout_clock() RETURNS timestamptz LANGUAGE sql VOLATILE AS $$ SELECT now(); $$;
-- Isolate the burst from preexisting fixture work; all changes roll back.
UPDATE public.orders SET status='cancelled' WHERE status='placed';
UPDATE public.trips SET status='cancelled' WHERE status='placed';
DELETE FROM public.inventory_reservations WHERE state='held';
INSERT INTO public.stores(id,name,is_active,lat,lng) VALUES('76000000-0000-0000-0000-000000000001','Expiry fixture',true,0,0);
INSERT INTO public.products(id,store_id,price,unit,is_in_stock,stock_status,stock_quantity,stock_tracking_enabled)
VALUES('76000000-0000-0000-0000-000000000002','76000000-0000-0000-0000-000000000001',10,'1 pc',false,'out_of_stock',0,true);
INSERT INTO public.orders(id,store_id,status,payment_method,placed_at)
SELECT md5('expiry-single-'||n)::uuid,'76000000-0000-0000-0000-000000000001','placed','online',now()-interval '21 minutes' FROM generate_series(1,350) n;
INSERT INTO public.trips(id,status,created_at)
SELECT md5('expiry-trip-'||n)::uuid,'placed',now()-interval '21 minutes' FROM generate_series(1,150) n;
INSERT INTO public.orders(id,trip_id,store_id,status,payment_method,placed_at)
SELECT md5('expiry-leg-'||n||'-'||leg)::uuid,md5('expiry-trip-'||n)::uuid,'76000000-0000-0000-0000-000000000001','placed','online',now()-interval '21 minutes'
FROM generate_series(1,150) n CROSS JOIN generate_series(1,2) leg;
INSERT INTO public.order_items(id,order_id,product_id,quantity,unit_price_at_order)
SELECT md5('expiry-item-'||id)::uuid,id,'76000000-0000-0000-0000-000000000002',1,10 FROM public.orders WHERE store_id='76000000-0000-0000-0000-000000000001';
INSERT INTO public.inventory_reservations(order_item_id,order_id,product_id,quantity,state,expires_at)
SELECT id,order_id,product_id,1,'held',now()-interval '1 minute' FROM public.order_items WHERE product_id='76000000-0000-0000-0000-000000000002';
INSERT INTO public.orders(id,status,payment_method,placed_at,razorpay_payment_id) VALUES
('76000000-0000-0000-0000-000000000010','placed','cod',now()-interval '1 hour',NULL),
('76000000-0000-0000-0000-000000000011','placed','online',now()-interval '1 hour','paid'),
('76000000-0000-0000-0000-000000000012','placed','online',now(),NULL);
-- Exercise the real stock-release trigger while keeping unrelated fixture
-- notification/address gates disabled for synthetic historic rows.
ALTER TABLE public.orders ENABLE TRIGGER orders_finish_inventory;
DO $$ DECLARE batch jsonb; total int:=0; passes int:=0; first_sample jsonb; second_sample jsonb; started timestamptz:=clock_timestamp(); BEGIN
 first_sample:=public.capacity_snapshot();
 IF (first_sample->'values'->>'expired_reservations')::integer<>650 THEN RAISE EXCEPTION 'Incorrect backlog sample'; END IF;
 LOOP
  batch:=public.expire_checkout_reservation_batch(100); passes:=passes+1;
  IF (batch->>'single_targets')::int>100 OR (batch->>'trip_targets')::int>100 THEN RAISE EXCEPTION 'Unbounded expiry'; END IF;
  total:=total+(batch->>'cancelled_orders')::int;
  EXIT WHEN (batch->>'single_targets')::int<100 AND (batch->>'trip_targets')::int<100;
  IF passes>10 THEN RAISE EXCEPTION 'Expiry did not drain'; END IF;
 END LOOP;
 IF total<>650 OR passes<>4 THEN RAISE EXCEPTION 'Burst lost targets: % in % passes',total,passes; END IF;
 IF (SELECT stock_quantity FROM public.products WHERE id='76000000-0000-0000-0000-000000000002')<>650 THEN RAISE EXCEPTION 'Stock not released exactly once'; END IF;
 PERFORM public.expire_checkout_reservation_batch(100);
 IF (SELECT stock_quantity FROM public.products WHERE id='76000000-0000-0000-0000-000000000002')<>650 THEN RAISE EXCEPTION 'Duplicate stock release'; END IF;
 IF EXISTS(SELECT 1 FROM public.orders WHERE id IN ('76000000-0000-0000-0000-000000000010','76000000-0000-0000-0000-000000000011','76000000-0000-0000-0000-000000000012') AND status<>'placed') THEN RAISE EXCEPTION 'COD/paid/not-expired order cancelled'; END IF;
 second_sample:=public.capacity_snapshot();
 IF second_sample<>first_sample THEN RAISE EXCEPTION 'Snapshot not shared/cached'; END IF;
 UPDATE public.capacity_sample SET snapshot='{}';
 second_sample:=public.capacity_snapshot();
 IF (second_sample->'values'->>'expired_reservations')::int<>0 THEN RAISE EXCEPTION 'Drained backlog not reflected'; END IF;
 IF has_function_privilege('authenticated','public.capacity_snapshot()','execute') OR has_function_privilege('anon','public.expire_checkout_reservation_batch(integer)','execute') THEN RAISE EXCEPTION 'Private worker RPC exposed'; END IF;
 RAISE NOTICE '650 orders across 350 singles and 150 two-leg trips drained in % passes (% ms, isolated fixture only)',passes,extract(epoch FROM clock_timestamp()-started)*1000;
END $$;
ROLLBACK;
