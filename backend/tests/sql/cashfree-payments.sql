\set ON_ERROR_STOP on
-- Migration 103 (Cashfree). Run on a disposable DB holding bootstrap +
-- migrations 001..102 (NOT 103): it seeds legacy Razorpay rows, applies 103,
-- then drives reserve -> claim -> settle -> cancel -> refund job and the
-- legacy manual-refund paths.
--   createdb flikk_cashfree_tests; psql -f tests/sql/migration-bootstrap.sql
--   (bootstrap checks the DB name: apply it + 001..102 via the manifest order)
--   psql -d flikk_cashfree_tests -f tests/sql/cashfree-payments.sql
DO $$ BEGIN IF current_database()<>'flikk_cashfree_tests' THEN RAISE EXCEPTION 'Use isolated flikk_cashfree_tests'; END IF; END $$;

-- Test clock: ordering-hours check passes at a fixed noon IST while set.
CREATE OR REPLACE FUNCTION public.checkout_clock() RETURNS timestamptz LANGUAGE sql AS
$$ SELECT coalesce(nullif(current_setting('test.clock',true),'')::timestamptz,clock_timestamp()) $$;

-- Fresh 001..102 lacks the live addresses map pin (pre-existing gap); fixture only.
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS latitude double precision,ADD COLUMN IF NOT EXISTS longitude double precision;
INSERT INTO public.zones(id,name,slug,is_active) VALUES('c0000000-0000-4000-8000-000000000001','Kaup','kaup',true);
INSERT INTO public.users(id,phone,role) VALUES
 ('c0000000-0000-4000-8000-000000000002','+910000000002','customer'),
 ('c0000000-0000-4000-8000-000000000003','+910000000003','store_owner');
INSERT INTO public.addresses(id,user_id,line1,zone_id,latitude,longitude) VALUES
 ('c0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000002','1 Main St','c0000000-0000-4000-8000-000000000001',13.21,74.75);
INSERT INTO public.stores(id,owner_user_id,zone_id,name,category,district,is_active,lat,lng) VALUES
 ('c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001','Kirana','grocery','Udupi',true,13.21,74.75);
INSERT INTO public.products(id,store_id,name,unit,price,category,approval_status,is_in_stock,stock_status,stock_tracking_enabled,stock_quantity) VALUES
 ('c0000000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000005','Rice','1 kg',50,'grocery','approved',true,'in_stock',true,100);

-- Legacy (pre-103) rows, inserted raw: paid single order with an open refund
-- job, paid cancellable order, unpaid checkout holding a Razorpay order, and a
-- paid two-leg trip.
SET session_replication_role=replica;
INSERT INTO public.orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,razorpay_payment_id,refund_status) VALUES
 ('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000004',50,20,5,70,'cancelled','online','pay_legacy1','processing'),
 ('c1000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000004',50,20,5,70,'placed','online','pay_legacy2','none'),
 ('c1000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000004',50,20,5,70,'placed','online',null,'none');
INSERT INTO public.order_refund_jobs(order_id,payment_id,target_paise,status) VALUES('c1000000-0000-4000-8000-000000000001','pay_legacy1',7000,'queued');
INSERT INTO public.checkout_payment_sessions(kind,target_id,customer_id,provider_order_id) VALUES('order','c1000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000002','order_rzp_legacy');
INSERT INTO public.trips(id,customer_id,address_id,delivery_fee,item_total,total,status,razorpay_order_id,razorpay_payment_id) VALUES
 ('c2000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000004',30,100,130,'placed','order_rzp_trip','pay_legacy_trip');
INSERT INTO public.orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,razorpay_payment_id,trip_id) VALUES
 ('c2000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000004',50,15,5,65,'placed','online','pay_legacy_trip','c2000000-0000-4000-8000-000000000001'),
 ('c2000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000004',50,15,5,65,'placed','online','pay_legacy_trip','c2000000-0000-4000-8000-000000000001');
SET session_replication_role=origin;

\ir ../../migrations/103_cashfree_payments.sql

DO $$
DECLARE body text; n integer; r jsonb; oid_ uuid:='c3000000-0000-4000-8000-000000000001'; res public.inventory_reservations;
 cust uuid:='c0000000-0000-4000-8000-000000000002';
BEGIN
 -- Schema: renamed columns, providers backfilled, no stale 'razorpay' reference.
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND column_name ILIKE '%razorpay%') THEN RAISE EXCEPTION 'razorpay column left'; END IF;
 SELECT string_agg(p.oid::regprocedure::text,', ') INTO body FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
  WHERE ns.nspname='public' AND (replace(p.prosrc,'''razorpay''','') ILIKE '%razorpay%' OR array_to_string(p.proargnames,',') ILIKE '%razorpay%');
 IF body IS NOT NULL THEN RAISE EXCEPTION 'Functions still reference razorpay: %',body; END IF;
 IF EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND (indexname||indexdef) ILIKE '%razorpay%')
  OR EXISTS(SELECT 1 FROM pg_constraint WHERE conname ILIKE '%razorpay%')
  OR EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND pg_get_triggerdef(oid) ILIKE '%razorpay%')
  OR EXISTS(SELECT 1 FROM pg_views WHERE schemaname='public' AND definition ILIKE '%razorpay%')
  OR EXISTS(SELECT 1 FROM pg_policies WHERE coalesce(qual,'')||coalesce(with_check,'') ILIKE '%razorpay%') THEN RAISE EXCEPTION 'razorpay name left in schema'; END IF;
 IF (SELECT array_agg(payment_provider ORDER BY id) FROM public.orders)<>ARRAY['razorpay','razorpay','cashfree','razorpay','razorpay']
  OR (SELECT payment_provider FROM public.trips)<>'razorpay'
  OR (SELECT payment_provider FROM public.checkout_payment_sessions)<>'razorpay' THEN RAISE EXCEPTION 'Provider backfill wrong'; END IF;
 IF (SELECT status FROM public.order_refund_jobs)<>'manual_required'
  OR (SELECT refund_status FROM public.orders WHERE id='c1000000-0000-4000-8000-000000000001')<>'manual_required' THEN RAISE EXCEPTION 'Open legacy refund not flipped'; END IF;
 IF (SELECT count(*) FROM public.customer_refund_updates)<>0 THEN RAISE EXCEPTION 'Backfill wrote customer refund history'; END IF;
 IF has_function_privilege('authenticated','public.mark_order_refund_manual(uuid,text)','execute')
  OR has_function_privilege('anon','public.settle_checkout_payment(uuid,uuid,text)','execute')
  OR NOT has_function_privilege('service_role','public.settle_checkout_payment(uuid,uuid,text)','execute') THEN RAISE EXCEPTION 'Function grants changed'; END IF;

 -- Legacy session cannot be paid through Cashfree; expiry reconciliation skips it.
 BEGIN PERFORM public.claim_checkout_payment(cust,'order','c1000000-0000-4000-8000-000000000003','upi'); RAISE EXCEPTION 'Legacy session claimable';
 EXCEPTION WHEN sqlstate 'P0410' THEN NULL; END;
 UPDATE public.orders SET placed_at=now()-interval '1 hour' WHERE id='c1000000-0000-4000-8000-000000000003';
 IF EXISTS(SELECT 1 FROM public.claim_checkout_expiry_reconciliation(25)) THEN RAISE EXCEPTION 'Legacy provider order sent to reconciliation'; END IF;
 r:=public.expire_checkout_reservation_batch(100);
 IF (r->>'cancelled_orders')::int<>1 OR (SELECT status FROM public.orders WHERE id='c1000000-0000-4000-8000-000000000003')<>'cancelled' THEN RAISE EXCEPTION 'Hard-cutoff expiry failed: %',r; END IF;

 -- Cashfree happy path: reserve -> claim -> settle -> cancel -> refund job.
 PERFORM set_config('test.clock',(date_trunc('day',now() AT TIME ZONE 'Asia/Kolkata')+interval '12 hours')::text||'+05:30',true);
 INSERT INTO public.orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method)
 VALUES(oid_,cust,'c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000004',50,20,5,70,'online');
 INSERT INTO public.order_items(order_id,product_id,quantity,unit_price_at_order) VALUES(oid_,'c0000000-0000-4000-8000-000000000006',1,50);
 PERFORM set_config('test.clock','',true);
 SELECT * INTO res FROM public.inventory_reservations WHERE order_id=oid_;
 IF res.state<>'held' OR (SELECT stock_quantity FROM public.products WHERE id='c0000000-0000-4000-8000-000000000006')<>99 THEN RAISE EXCEPTION 'Reserve failed'; END IF;
 r:=public.claim_checkout_payment(cust,'order',oid_,'order');
 IF NOT (r->>'claimed')::boolean OR r->'session'->>'payment_provider'<>'cashfree' THEN RAISE EXCEPTION 'Claim failed: %',r; END IF;
 BEGIN PERFORM public.mark_order_refund_manual(oid_,'UTR123'); RAISE EXCEPTION 'Manual mark on non-manual refund';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Refund is not awaiting%' THEN RAISE; END IF; END;
 r:=public.settle_checkout_payment(oid_,null,'cf_pay_1');
 IF NOT (r->>'accepted')::boolean OR (SELECT provider_payment_id FROM public.orders WHERE id=oid_)<>'cf_pay_1'
  OR (SELECT state FROM public.inventory_reservations WHERE order_id=oid_)<>'committed' THEN RAISE EXCEPTION 'Settle failed: %',r; END IF;
 r:=public.settle_checkout_payment(oid_,null,'cf_pay_1');
 IF (r->>'settled_now')::boolean THEN RAISE EXCEPTION 'Settle not idempotent'; END IF;
 UPDATE public.orders SET status='cancelled',cancel_reason='test' WHERE id=oid_;
 IF (SELECT status FROM public.order_refund_jobs WHERE order_id=oid_)<>'queued' OR (SELECT refund_status FROM public.orders WHERE id=oid_)<>'processing'
  OR (SELECT stock_quantity FROM public.products WHERE id='c0000000-0000-4000-8000-000000000006')<>100 THEN RAISE EXCEPTION 'Cancel/refund intent failed'; END IF;
 SELECT count(*) INTO n FROM public.claim_order_refunds();
 IF n<>1 OR (SELECT lease_token FROM public.order_refund_jobs WHERE order_id=oid_) IS NULL THEN RAISE EXCEPTION 'Refund worker claimed % jobs (manual_required must be skipped)',n; END IF;
 PERFORM public.save_order_refund((SELECT id FROM public.order_refund_jobs WHERE order_id=oid_),(SELECT lease_token FROM public.order_refund_jobs WHERE order_id=oid_),
  jsonb_build_object('status','completed','provider_refund_id','rf_x','request_paise',7000,'release',true));
 IF (SELECT provider_refund_id FROM public.orders WHERE id=oid_)<>'rf_x' OR (SELECT refund_status FROM public.orders WHERE id=oid_)<>'completed' THEN RAISE EXCEPTION 'save_order_refund failed'; END IF;

 -- Legacy single order cancelled after 103 -> manual_required, never claimed.
 UPDATE public.orders SET status='cancelled',cancel_reason='test' WHERE id='c1000000-0000-4000-8000-000000000002';
 IF (SELECT status FROM public.order_refund_jobs WHERE order_id='c1000000-0000-4000-8000-000000000002')<>'manual_required'
  OR (SELECT refund_status FROM public.orders WHERE id='c1000000-0000-4000-8000-000000000002')<>'manual_required' THEN RAISE EXCEPTION 'Legacy cancel not manual'; END IF;
 PERFORM public.request_order_refund('c1000000-0000-4000-8000-000000000002');
 UPDATE public.order_refund_jobs SET status='failed',last_error='Provider refund failed' WHERE order_id='c1000000-0000-4000-8000-000000000001';
 PERFORM public.retry_order_refund('c1000000-0000-4000-8000-000000000001');
 IF (SELECT status FROM public.order_refund_jobs WHERE order_id='c1000000-0000-4000-8000-000000000001')<>'manual_required'
  OR (SELECT refund_status FROM public.orders WHERE id='c1000000-0000-4000-8000-000000000002')<>'manual_required' THEN RAISE EXCEPTION 'Legacy retry/request requeued'; END IF;
 IF EXISTS(SELECT 1 FROM public.claim_order_refunds()) THEN RAISE EXCEPTION 'Legacy refund claimed'; END IF;
 BEGIN PERFORM public.mark_order_refund_manual('c1000000-0000-4000-8000-000000000002','  ab '); RAISE EXCEPTION 'Short reference accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Refund reference%' THEN RAISE; END IF; END;
 PERFORM public.mark_order_refund_manual('c1000000-0000-4000-8000-000000000002',' UTR4455 ');
 IF (SELECT row(refund_status,provider_refund_id)::text FROM public.orders WHERE id='c1000000-0000-4000-8000-000000000002')<>'(completed,manual:UTR4455)'
  OR (SELECT row(status,provider_refund_id)::text FROM public.order_refund_jobs WHERE order_id='c1000000-0000-4000-8000-000000000002')<>'(completed,manual:UTR4455)' THEN RAISE EXCEPTION 'Manual mark failed'; END IF;

 -- Legacy trip: cancel -> trip refund + legs manual_required -> admin marks via a leg.
 r:=public.cancel_customer_trip('c2000000-0000-4000-8000-000000000001',cust,'test');
 IF r->>'outcome'<>'cancelled' OR (SELECT status FROM public.trip_refunds)<>'manual_required'
  OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id='c2000000-0000-4000-8000-000000000001' AND refund_status<>'manual_required') THEN RAISE EXCEPTION 'Legacy trip refund not manual: %',r; END IF;
 IF EXISTS(SELECT 1 FROM public.claim_trip_refunds()) THEN RAISE EXCEPTION 'Legacy trip refund claimed'; END IF;
 PERFORM public.mark_order_refund_manual('c2000000-0000-4000-8000-000000000003','UTR9999');
 IF (SELECT row(status,provider_refund_id,refunded_paise)::text FROM public.trip_refunds)<>'(completed,manual:UTR9999,13000)'
  OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id='c2000000-0000-4000-8000-000000000001' AND refund_status<>'completed') THEN RAISE EXCEPTION 'Trip manual mark failed'; END IF;
END $$;
SELECT 'Cashfree migration 103: renames, backfill, Cashfree checkout/refund path and legacy manual refunds passed' AS result;
