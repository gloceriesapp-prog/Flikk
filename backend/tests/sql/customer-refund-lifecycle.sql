\set ON_ERROR_STOP on
-- Use only the disposable fresh migration fixture. No live payment calls.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated flikk_migrations_tests'; END IF; END $$;
BEGIN;
SET session_replication_role=replica;
INSERT INTO public.zones(id,name,slug,is_active) VALUES('e0000000-0000-4000-8000-000000000001','Refund test','refund-test',true);
INSERT INTO public.users(id,phone,role) VALUES
 ('e0000000-0000-4000-8000-000000000002','+919876001231','customer'),
 ('e0000000-0000-4000-8000-000000000003','+919876001232','store_owner');
INSERT INTO public.addresses(id,user_id,line1,zone_id) VALUES
 ('e0000000-0000-4000-8000-000000000004','e0000000-0000-4000-8000-000000000002','Test','e0000000-0000-4000-8000-000000000001');
INSERT INTO public.stores(id,owner_user_id,zone_id,name,category,district,is_active,lat,lng) VALUES
 ('e0000000-0000-4000-8000-000000000005','e0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001','Test','grocery','Udupi',true,13.21,74.75);
INSERT INTO public.orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,provider_payment_id,payment_provider,placed_at,reservation_expires_at,reservation_release_after) VALUES
 ('e1000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000005','e0000000-0000-4000-8000-000000000004',1,0,0,1,'cancelled','online','pay_test','razorpay',now(),now(),now());
SET session_replication_role=origin;
UPDATE public.orders SET refund_status='processing' WHERE id='e1000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF (SELECT count(*) FROM customer_notifications WHERE order_id='e1000000-0000-4000-8000-000000000001' AND event='refund_requested')<>1 THEN RAISE EXCEPTION 'Missing queued notification'; END IF;
 IF EXISTS(SELECT 1 FROM customer_notifications WHERE order_id='e1000000-0000-4000-8000-000000000001' AND title='Refund initiated') THEN RAISE EXCEPTION 'Initiated before provider acceptance'; END IF;
END $$;
UPDATE public.orders SET provider_refund_id='rfnd_test' WHERE id='e1000000-0000-4000-8000-000000000001';
UPDATE public.orders SET provider_refund_id='rfnd_test',refund_status='processing' WHERE id='e1000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF (SELECT count(*) FROM customer_notifications WHERE order_id='e1000000-0000-4000-8000-000000000001' AND event='refund_initiated:rfnd_test')<>1 THEN RAISE EXCEPTION 'Initiation must notify exactly once'; END IF;
 IF NOT EXISTS(SELECT 1 FROM customer_refund_history WHERE target_id='e1000000-0000-4000-8000-000000000001' AND provider_refund_id='rfnd_test') THEN RAISE EXCEPTION 'Customer API missing provider acceptance'; END IF;
END $$;
UPDATE public.orders SET refund_status='completed' WHERE id='e1000000-0000-4000-8000-000000000001';
UPDATE public.orders SET refund_status='completed' WHERE id='e1000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF (SELECT count(*) FROM customer_notifications WHERE order_id='e1000000-0000-4000-8000-000000000001' AND event='refund_completed')<>1 THEN RAISE EXCEPTION 'Completion must notify exactly once'; END IF;
END $$;
-- An attention state is an update, never a success or repeated notification.
UPDATE public.orders SET refund_status='failed' WHERE id='e1000000-0000-4000-8000-000000000001';
UPDATE public.orders SET refund_status='manual_required' WHERE id='e1000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF (SELECT count(*) FROM customer_notifications WHERE order_id='e1000000-0000-4000-8000-000000000001' AND event='refund_attention')<>1 THEN RAISE EXCEPTION 'Attention update must not duplicate'; END IF;
 IF has_table_privilege('authenticated','public.customer_refund_history','SELECT') THEN RAISE EXCEPTION 'Refund view must remain service only'; END IF;
END $$;
-- Model a combined refund copying its state to two leg orders.
SET session_replication_role=replica;
INSERT INTO public.trips(id,customer_id,address_id,item_total,delivery_fee,total,status,reservation_expires_at,reservation_release_after) VALUES
 ('e2000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000004',2,0,2,'cancelled',now(),now());
INSERT INTO public.orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,provider_payment_id,trip_id,placed_at,reservation_expires_at,reservation_release_after) SELECT id,'e0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000005','e0000000-0000-4000-8000-000000000004',1,0,0,1,'cancelled','online','pay_trip','e2000000-0000-4000-8000-000000000001',now(),now(),now() FROM unnest(ARRAY['e1000000-0000-4000-8000-000000000002'::uuid,'e1000000-0000-4000-8000-000000000003'::uuid]) id;
INSERT INTO public.trip_refunds(trip_id,payment_id,target_paise) VALUES('e2000000-0000-4000-8000-000000000001','pay_trip',200);
SET session_replication_role=origin;
UPDATE public.orders SET refund_status='processing',provider_refund_id='rfnd_trip' WHERE trip_id='e2000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF (SELECT count(*) FROM customer_notifications WHERE order_id='e1000000-0000-4000-8000-000000000002' AND event='refund_initiated:rfnd_trip')<>1 THEN RAISE EXCEPTION 'Combined refund must notify once, not per leg'; END IF;
END $$;
ROLLBACK;
