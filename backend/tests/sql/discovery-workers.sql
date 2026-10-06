\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_checkout_tests' THEN RAISE EXCEPTION 'Isolated fixture only'; END IF; END $$;
BEGIN;
ALTER TABLE public.stores DISABLE TRIGGER USER;
ALTER TABLE public.orders DISABLE TRIGGER USER;
ALTER TABLE public.stores ADD COLUMN payout_method text,ADD COLUMN razorpay_fund_account_id text;
ALTER TABLE public.orders ADD COLUMN dispatch_radius_m integer,ADD COLUMN dispatch_broadcast_at timestamptz;
ALTER TABLE public.payouts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.payouts ADD COLUMN gross_amount numeric,ADD COLUMN commission_deducted numeric,ADD COLUMN net_payout numeric,
 ADD COLUMN status text DEFAULT 'pending',ADD COLUMN paid_at timestamptz,ADD COLUMN razorpay_payout_id text;
CREATE UNIQUE INDEX fixture_payout_week ON public.payouts(store_id,week_start);
ALTER TABLE public.rider_payouts ADD COLUMN status text,ADD COLUMN amount numeric,ADD COLUMN paid_at timestamptz,ADD COLUMN razorpay_payout_id text;
CREATE TABLE public.riders(user_id uuid,payout_method text,razorpay_fund_account_id text);
ALTER TABLE public.rider_earnings ADD COLUMN rider_payout_id uuid,ADD COLUMN paid_at timestamptz;
\i backend/migrations/074_indexed_store_discovery.sql
\i backend/migrations/075_durable_background_workers.sql
INSERT INTO public.zones(id,is_active) VALUES('74000000-0000-0000-0000-000000000001',true),('74000000-0000-0000-0000-000000000002',false);
INSERT INTO public.stores(id,zone_id,is_active,lat,lng,delivery_radius_km,name,payout_method,razorpay_fund_account_id) VALUES
 ('74000000-0000-0000-0000-000000000010','74000000-0000-0000-0000-000000000001',false,0,0,12,'Closed nearest','upi','fund1'),
 ('74000000-0000-0000-0000-000000000011','74000000-0000-0000-0000-000000000001',true,0,0.1,1,'Outside own reach',NULL,NULL),
 ('74000000-0000-0000-0000-000000000012','74000000-0000-0000-0000-000000000002',true,0,0,12,'Other zone',NULL,NULL),
 ('74000000-0000-0000-0000-000000000013','74000000-0000-0000-0000-000000000001',true,0,-179.99,12,'Dateline',NULL,NULL),
 ('74000000-0000-0000-0000-000000000014','74000000-0000-0000-0000-000000000001',true,NULL,NULL,12,'Missing location',NULL,NULL),
 ('74000000-0000-0000-0000-000000000015','74000000-0000-0000-0000-000000000001',true,89.99,-90,12,'Pole',NULL,NULL);
DO $$ DECLARE n int; r record; BEGIN
 SELECT count(*) INTO n FROM public.nearby_customer_stores(0,0,'74000000-0000-0000-0000-000000000001');
 IF n<>1 THEN RAISE EXCEPTION 'Radius/zone/location filtering failed'; END IF;
 SELECT * INTO r FROM public.nearby_customer_stores(0,0,'74000000-0000-0000-0000-000000000001',1);
 IF (r.store->>'is_active')::boolean OR r.distance_km<>0 THEN RAISE EXCEPTION 'Closed store excluded'; END IF;
 SELECT count(*) INTO n FROM public.nearby_customer_stores(0,179.99,'74000000-0000-0000-0000-000000000001');
 IF n<>1 THEN RAISE EXCEPTION 'Dateline bounding failed'; END IF;
 SELECT count(*) INTO n FROM public.nearby_customer_stores(90,0,'74000000-0000-0000-0000-000000000001');
 IF n<>1 THEN RAISE EXCEPTION 'Pole bounding failed'; END IF;
 IF has_function_privilege('authenticated','public.nearby_customer_stores(double precision,double precision,uuid,integer,double precision)','EXECUTE') THEN RAISE EXCEPTION 'RPC exposed'; END IF;
END $$;
-- Only one worker can own a due job. Retry time must not alter the
-- scheduled settlement week; a dead worker token cannot finalize takeover.
UPDATE public.scheduled_work SET next_run_at=now()+interval '1 year';
UPDATE public.scheduled_work SET next_run_at='2026-09-14T03:30:00Z' WHERE name='weeklyPayouts';
DO $$ DECLARE a record; b record; n int; BEGIN
 SELECT * INTO a FROM public.claim_scheduled_work(1);
 SELECT count(*) INTO n FROM public.claim_scheduled_work(1);
 IF n<>0 THEN RAISE EXCEPTION 'Concurrent ownership not exclusive'; END IF;
 UPDATE public.scheduled_work SET lease_until=now()-interval '1 second' WHERE name=a.name;
 SELECT * INTO b FROM public.claim_scheduled_work(1);
 IF a.lease_token=b.lease_token OR a.scheduled_for<>b.scheduled_for THEN RAISE EXCEPTION 'Takeover changed identity or schedule'; END IF;
 IF public.renew_scheduled_work(a.name,a.lease_token) OR public.finish_scheduled_work(a.name,a.lease_token) THEN RAISE EXCEPTION 'Stale worker not fenced'; END IF;
 PERFORM public.finish_scheduled_work(b.name,b.lease_token,'retry');
 IF (SELECT next_run_at FROM public.scheduled_work WHERE name=b.name)<>b.scheduled_for THEN RAISE EXCEPTION 'Retry lost settlement date'; END IF;
 UPDATE public.scheduled_work SET retry_at=now()-interval '1 second' WHERE name=b.name;
 SELECT * INTO b FROM public.claim_scheduled_work(1);
 PERFORM public.finish_scheduled_work(b.name,b.lease_token);
 IF (SELECT next_run_at FROM public.scheduled_work WHERE name=b.name)<>b.scheduled_for+interval '7 days' THEN RAISE EXCEPTION 'Weekly catch-up failed'; END IF;
END $$;
INSERT INTO public.orders(id,store_id,status,item_total,commission_amount,delivered_at) VALUES
 ('75000000-0000-0000-0000-000000000020','74000000-0000-0000-0000-000000000010','delivered',100,10,'2026-09-08T12:00:00Z'),
 ('75000000-0000-0000-0000-000000000021','74000000-0000-0000-0000-000000000010','packed',100,10,NULL);
DO $$ DECLARE a record; b record; n int; frozen jsonb; BEGIN
 IF public.compute_store_payouts('2026-09-06T18:30:00Z','2026-09-13T18:30:00Z','2026-09-07','2026-09-14')<>1 THEN RAISE EXCEPTION 'Settlement computation failed'; END IF;
 IF public.compute_store_payouts('2026-09-06T18:30:00Z','2026-09-13T18:30:00Z','2026-09-07','2026-09-14')<>0 THEN RAISE EXCEPTION 'Settlement repeated'; END IF;
 SELECT * INTO a FROM public.claim_payout_releases('store','account',25);
 IF a.request->>'amount'<>'9000' OR a.request->>'fund_account_id'<>'fund1' THEN RAISE EXCEPTION 'Wrong frozen transfer'; END IF;
 frozen:=a.request;
 SELECT count(*) INTO n FROM public.claim_payout_releases('store','account',25);
 IF n<>0 THEN RAISE EXCEPTION 'Transfer duplicated'; END IF;
 UPDATE public.stores SET razorpay_fund_account_id='changed' WHERE id='74000000-0000-0000-0000-000000000010';
 UPDATE public.payout_release_work SET lease_until=now()-interval '1 second' WHERE id=a.id;
 SELECT * INTO b FROM public.claim_payout_releases('store','changed-account',25);
 IF b.id<>a.id OR b.request<>frozen THEN RAISE EXCEPTION 'Retry changed idempotency key/body'; END IF;
 IF public.finish_payout_release(a.id,a.lease_token,'old') THEN RAISE EXCEPTION 'Stale transfer not fenced'; END IF;
 PERFORM public.settle_payout_webhook(b.payout_id,'pout1','payout.processed');
 IF NOT public.finish_payout_release(b.id,b.lease_token,'pout1') THEN RAISE EXCEPTION 'Transfer save failed'; END IF;
 IF (SELECT status FROM public.payouts WHERE id=b.payout_id)<>'paid' THEN RAISE EXCEPTION 'Early webhook overwritten'; END IF;
 PERFORM public.settle_payout_webhook(b.payout_id,'pout1','payout.reversed');
 IF (SELECT status FROM public.payouts WHERE id=b.payout_id)<>'failed' THEN RAISE EXCEPTION 'Reversal ignored'; END IF;
 SELECT count(*) INTO n FROM public.advance_dispatch_offers(100,'75000000-0000-0000-0000-000000000021');
 IF n<>1 THEN RAISE EXCEPTION 'Initial dispatch missed'; END IF;
 SELECT count(*) INTO n FROM public.advance_dispatch_offers(100,'75000000-0000-0000-0000-000000000021');
 IF n<>0 THEN RAISE EXCEPTION 'Initial dispatch duplicated'; END IF;
 UPDATE public.orders SET dispatch_broadcast_at=now()-interval '1 minute' WHERE id='75000000-0000-0000-0000-000000000021';
 SELECT * INTO b FROM public.advance_dispatch_offers(100);
 IF b.radius_m<>5000 THEN RAISE EXCEPTION 'Radius advancement failed'; END IF;
END $$;
INSERT INTO public.riders(user_id,payout_method,razorpay_fund_account_id) VALUES('75000000-0000-0000-0000-000000000031','upi','rider-fund');
INSERT INTO public.rider_payouts(id,rider_id,week_start,amount,status) VALUES('75000000-0000-0000-0000-000000000032','75000000-0000-0000-0000-000000000031','2026-09-07',25,'pending');
INSERT INTO public.rider_earnings(id,rider_id,rider_payout_id,amount) VALUES('75000000-0000-0000-0000-000000000033','75000000-0000-0000-0000-000000000031','75000000-0000-0000-0000-000000000032',25);
DO $$ DECLARE r record; BEGIN
 SELECT * INTO r FROM public.claim_payout_releases('rider','account',25);
 IF (SELECT paid_at FROM public.rider_earnings WHERE id='75000000-0000-0000-0000-000000000033') IS NOT NULL THEN RAISE EXCEPTION 'Earnings prematurely paid'; END IF;
 PERFORM public.settle_payout_webhook(r.payout_id,'rider-pout1','payout.processed');
 IF (SELECT paid_at FROM public.rider_earnings WHERE id='75000000-0000-0000-0000-000000000033') IS NULL THEN RAISE EXCEPTION 'Earnings not settled atomically'; END IF;
 PERFORM public.settle_payout_webhook(r.payout_id,'rider-pout1','payout.reversed');
 IF (SELECT paid_at FROM public.rider_earnings WHERE id='75000000-0000-0000-0000-000000000033') IS NOT NULL THEN RAISE EXCEPTION 'Reversal left paid earning marker'; END IF;
END $$;
ROLLBACK;
