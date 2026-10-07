\set ON_ERROR_STOP on
-- Migration 106 (UPI claim release, trip refund leg sync, manual handling of
-- rejected trip refunds). Run on the disposable fresh-migration fixture:
--   createdb flikk_migrations_tests
--   PGDATABASE=flikk_migrations_tests node backend/scripts/verify-fresh-migrations.mjs
--   PGDATABASE=flikk_migrations_tests psql -X -v ON_ERROR_STOP=1 -f backend/tests/sql/payment-refund-recovery.sql
-- It seeds pre-106 state (stale UPI claim, failed/completed trip refunds with
-- unsynced legs), re-applies 106 (idempotent) to exercise its backfill, then
-- drives claim_checkout_payment, enqueue_trip_refund, save_trip_refund and
-- mark_order_refund_manual. Fixture rows are left in the disposable database.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated flikk_migrations_tests'; END IF; END $$;

SET session_replication_role=replica;
INSERT INTO public.zones(id,name,slug,is_active) VALUES('d0000000-0000-4000-8000-000000000001','Refund Zone','refund-zone',true);
INSERT INTO public.users(id,phone,role) VALUES
 ('d0000000-0000-4000-8000-000000000002','+910000001002','customer'),
 ('d0000000-0000-4000-8000-000000000003','+910000001003','store_owner'),
 ('d0000000-0000-4000-8000-000000000009','+910000001009','admin');
INSERT INTO public.addresses(id,user_id,line1,zone_id) VALUES
 ('d0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000002','1 Main St','d0000000-0000-4000-8000-000000000001');
INSERT INTO public.stores(id,owner_user_id,zone_id,name,category,district,is_active,lat,lng) VALUES
 ('d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000001','Kirana','grocery','Udupi',true,13.21,74.75);
-- Unpaid online single order whose UPI claim was left 'creating' before 106.
INSERT INTO public.orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,placed_at) VALUES
 ('d1000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000004',50,20,5,70,'placed','online',now());
INSERT INTO public.checkout_payment_sessions(kind,target_id,customer_id,provider_order_id,upi_state) VALUES
 ('order','d1000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','gl_d1000000000040008000000000000001','creating');
-- Paid Cashfree trips: T1 refund completed (legs still 'processing' / 'none'),
-- T2 refund failed (legs 'processing'), T3 refund queued (legs 'none').
INSERT INTO public.trips(id,customer_id,address_id,delivery_fee,item_total,total,status,provider_payment_id,payment_provider) VALUES
 ('d2000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000004',30,100,130,'cancelled','cf_t1','cashfree'),
 ('d2000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000004',30,100,130,'failed','cf_t2','cashfree'),
 ('d2000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000004',30,100,130,'cancelled','cf_t3','cashfree');
INSERT INTO public.orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,provider_payment_id,refund_status,trip_id) VALUES
 ('d2100000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000004',50,15,5,65,'cancelled','online','cf_t1','processing','d2000000-0000-4000-8000-000000000001'),
 ('d2100000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000004',50,15,5,65,'cancelled','online','cf_t1','none','d2000000-0000-4000-8000-000000000001'),
 ('d2200000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000004',50,15,5,65,'failed','online','cf_t2','processing','d2000000-0000-4000-8000-000000000002'),
 ('d2200000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000004',50,15,5,65,'failed','online','cf_t2','processing','d2000000-0000-4000-8000-000000000002'),
 ('d2300000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000004',50,15,5,65,'cancelled','online','cf_t3','none','d2000000-0000-4000-8000-000000000003');
INSERT INTO public.trip_refunds(trip_id,payment_id,target_paise,refunded_paise,status,provider_refund_id) VALUES
 ('d2000000-0000-4000-8000-000000000001','cf_t1',13000,13000,'completed','rf_t1'),
 ('d2000000-0000-4000-8000-000000000002','cf_t2',13000,0,'failed','rf_t2'),
 ('d2000000-0000-4000-8000-000000000003','cf_t3',13000,0,'queued',null);
SET session_replication_role=origin;

\ir ../../migrations/106_payment_refund_recovery.sql

DO $$
DECLARE r jsonb; o uuid:='d1000000-0000-4000-8000-000000000001'; cust uuid:='d0000000-0000-4000-8000-000000000002';
 t4 uuid:='d2000000-0000-4000-8000-000000000004'; j public.trip_refunds; ok boolean; req public.customer_deletion_requests;
BEGIN
 -- Grants.
 IF has_function_privilege('anon','public.save_trip_refund(uuid,uuid,jsonb)','execute')
  OR has_function_privilege('authenticated','public.save_trip_refund(uuid,uuid,jsonb)','execute')
  OR has_function_privilege('authenticated','public.claim_checkout_payment(uuid,text,uuid,text)','execute')
  OR has_function_privilege('authenticated','public.enqueue_trip_refund(uuid)','execute')
  OR NOT has_function_privilege('service_role','public.save_trip_refund(uuid,uuid,jsonb)','execute')
  OR NOT has_function_privilege('service_role','public.claim_checkout_payment(uuid,text,uuid,text)','execute') THEN RAISE EXCEPTION 'Function grants wrong'; END IF;

 -- Backfill: legs follow their trip refund; a failed trip refund is manual.
 IF EXISTS(SELECT 1 FROM public.orders WHERE trip_id='d2000000-0000-4000-8000-000000000001' AND (refund_status<>'completed' OR provider_refund_id<>'rf_t1' OR refunded_at IS NULL))
  THEN RAISE EXCEPTION 'Completed trip refund not synced to legs'; END IF;
 IF (SELECT status FROM public.trip_refunds WHERE trip_id='d2000000-0000-4000-8000-000000000002')<>'manual_required'
  OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id='d2000000-0000-4000-8000-000000000002' AND refund_status<>'manual_required')
  THEN RAISE EXCEPTION 'Failed trip refund not moved to manual handling'; END IF;
 IF (SELECT refund_status FROM public.orders WHERE id='d2300000-0000-4000-8000-000000000001')<>'processing' THEN RAISE EXCEPTION 'Queued trip refund legs left none'; END IF;
 IF EXISTS(SELECT 1 FROM public.customer_refund_updates WHERE target_id IN(SELECT id FROM public.orders WHERE trip_id::text LIKE 'd2%') OR target_id::text LIKE 'd2%')
  THEN RAISE EXCEPTION 'Backfill wrote customer refund history'; END IF;

 -- Admin closes the rejected trip refund through the existing manual path.
 PERFORM public.mark_order_refund_manual('d2200000-0000-4000-8000-000000000002','UTR77001');
 IF (SELECT row(status,provider_refund_id,refunded_paise)::text FROM public.trip_refunds WHERE trip_id='d2000000-0000-4000-8000-000000000002')<>'(completed,manual:UTR77001,13000)'
  OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id='d2000000-0000-4000-8000-000000000002' AND refund_status<>'completed') THEN RAISE EXCEPTION 'Manual close of rejected trip refund failed'; END IF;

 -- UPI: a pre-106 'creating' claim (no timestamp) is stale and reclaimable.
 r:=public.claim_checkout_payment(cust,'order',o,'upi');
 IF NOT (r->>'claimed')::boolean OR r->'session'->>'upi_state'<>'creating' OR (r->'session'->>'upi_claimed_at')::timestamptz<>now() THEN RAISE EXCEPTION 'Stale legacy claim not reclaimed: %',r; END IF;
 -- A fresh claim blocks a concurrent attempt.
 r:=public.claim_checkout_payment(cust,'order',o,'upi');
 IF (r->>'claimed')::boolean THEN RAISE EXCEPTION 'Fresh UPI claim taken twice'; END IF;
 -- Released after a provider rejection (API sets upi_state NULL): claimable.
 UPDATE public.checkout_payment_sessions SET upi_state=null WHERE kind='order' AND target_id=o;
 IF NOT (public.claim_checkout_payment(cust,'order',o,'upi')->>'claimed')::boolean THEN RAISE EXCEPTION 'Released UPI claim not reclaimable'; END IF;
 -- Timed-out claim: reclaimable only after 2 minutes, and it clears old links.
 UPDATE public.checkout_payment_sessions SET upi_claimed_at=now()-interval '90 seconds',upi_link='{"default":"upi://old"}',upi_payment_id='old' WHERE kind='order' AND target_id=o;
 IF (public.claim_checkout_payment(cust,'order',o,'upi')->>'claimed')::boolean THEN RAISE EXCEPTION 'In-flight UPI claim reclaimed early'; END IF;
 UPDATE public.checkout_payment_sessions SET upi_claimed_at=now()-interval '3 minutes' WHERE kind='order' AND target_id=o;
 r:=public.claim_checkout_payment(cust,'order',o,'upi');
 IF NOT (r->>'claimed')::boolean OR r->'session'->>'upi_link' IS NOT NULL OR r->'session'->>'upi_payment_id' IS NOT NULL THEN RAISE EXCEPTION 'Stale UPI claim not reclaimed cleanly: %',r; END IF;
 -- A delivered attempt ('ready') still replays instead of re-claiming.
 UPDATE public.checkout_payment_sessions SET upi_state='ready',upi_claimed_at=now()-interval '1 hour' WHERE kind='order' AND target_id=o;
 IF (public.claim_checkout_payment(cust,'order',o,'upi')->>'claimed')::boolean THEN RAISE EXCEPTION 'Ready UPI attempt re-claimed'; END IF;

 -- New paid Cashfree trip cancelled: refund queued and legs 'processing'.
 SET LOCAL session_replication_role=replica;
 INSERT INTO public.trips(id,customer_id,address_id,delivery_fee,item_total,total,status,provider_payment_id,payment_provider) VALUES
  (t4,cust,'d0000000-0000-4000-8000-000000000004',30,100,130,'placed','cf_t4','cashfree');
 INSERT INTO public.orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,provider_payment_id,trip_id) VALUES
  ('d2400000-0000-4000-8000-000000000001',cust,'d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000004',50,15,5,65,'cancelled','online','cf_t4',t4),
  ('d2400000-0000-4000-8000-000000000002',cust,'d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000004',50,15,5,65,'cancelled','online','cf_t4',t4);
 SET LOCAL session_replication_role=origin;
 UPDATE public.trips SET status='cancelled' WHERE id=t4;
 SELECT * INTO j FROM public.trip_refunds WHERE trip_id=t4;
 IF j.status<>'queued' OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id=t4 AND refund_status<>'processing') THEN RAISE EXCEPTION 'Cashfree trip refund legs not processing: %',j.status; END IF;

 -- Worker save: lease-guarded, amount frozen, outcome copied to the legs.
 UPDATE public.trip_refunds SET next_attempt_at=now()-interval '1 second' WHERE id=j.id;
 PERFORM public.claim_trip_refunds();
 SELECT * INTO j FROM public.trip_refunds WHERE id=j.id;
 IF j.lease_token IS NULL THEN RAISE EXCEPTION 'Trip refund not claimed'; END IF;
 IF public.save_trip_refund(j.id,gen_random_uuid(),'{"status":"completed"}') THEN RAISE EXCEPTION 'Save without lease accepted'; END IF;
 IF NOT public.save_trip_refund(j.id,j.lease_token,'{"request_paise":13000}') THEN RAISE EXCEPTION 'Leased save refused'; END IF;
 BEGIN PERFORM public.save_trip_refund(j.id,j.lease_token,'{"request_paise":12000}'); RAISE EXCEPTION 'Frozen amount changed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Frozen refund amount%' THEN RAISE; END IF; END;
 ok:=public.save_trip_refund(j.id,j.lease_token,jsonb_build_object('status','processing','provider_refund_id','rf_t4','refunded_paise',0,'last_error',null,'next_attempt_at',now()+interval '1 minute'));
 IF EXISTS(SELECT 1 FROM public.orders WHERE trip_id=t4 AND (refund_status<>'processing' OR provider_refund_id<>'rf_t4')) THEN RAISE EXCEPTION 'Processing refund id not on legs'; END IF;
 ok:=public.save_trip_refund(j.id,j.lease_token,'{"status":"completed","refunded_paise":13000,"release":true}');
 SELECT * INTO j FROM public.trip_refunds WHERE id=j.id;
 IF NOT ok OR j.status<>'completed' OR j.lease_token IS NOT NULL OR j.refunded_paise<>13000 OR j.request_paise<>13000 OR j.provider_refund_id<>'rf_t4'
  OR EXISTS(SELECT 1 FROM public.orders WHERE trip_id=t4 AND (refund_status<>'completed' OR provider_refund_id<>'rf_t4' OR refunded_at IS NULL)) THEN RAISE EXCEPTION 'Completed trip refund not synced'; END IF;

 -- T3 (claimed in the same batch) completes too.
 SELECT * INTO j FROM public.trip_refunds WHERE trip_id='d2000000-0000-4000-8000-000000000003';
 ok:=public.save_trip_refund(j.id,j.lease_token,'{"status":"completed","provider_refund_id":"rf_t3","refunded_paise":13000,"release":true}');
 IF NOT ok OR (SELECT refund_status FROM public.orders WHERE id='d2300000-0000-4000-8000-000000000001')<>'completed' THEN RAISE EXCEPTION 'T3 not completed'; END IF;

 -- Account deletion is no longer blocked by refunded paid trip legs.
 INSERT INTO public.customer_deletion_requests(customer_id) VALUES(cust) RETURNING * INTO req;
 UPDATE public.orders SET status='cancelled' WHERE id='d1000000-0000-4000-8000-000000000001';
 req:=public.review_customer_deletion(req.id,'d0000000-0000-4000-8000-000000000009',true,'Refunds complete');
 IF req.status<>'approved' THEN RAISE EXCEPTION 'Deletion still blocked'; END IF;
END $$;
SELECT 'Migration 106: UPI claim release, trip refund leg sync and manual handling passed' AS result;
