\set ON_ERROR_STOP on
\if :{?missing_delivery_otp}
\else
\set missing_delivery_otp false
\endif
DO $$ BEGIN IF current_database()<>'flikk_checkout_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
ALTER TABLE stores ADD COLUMN name text DEFAULT 'Synthetic store',ADD COLUMN payout_bank_account_number text DEFAULT 'private-bank',ADD COLUMN pan_number text DEFAULT 'private-pan';
CREATE POLICY stores_active_read ON stores FOR SELECT USING(is_active OR owner_user_id=auth.uid());
ALTER TABLE orders ADD COLUMN rider_id uuid,ADD COLUMN delivered_at timestamptz,ADD COLUMN delivery_otp text;
CREATE POLICY rider_order_read ON orders FOR SELECT USING(rider_id=auth.uid());
CREATE TABLE rider_earnings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),rider_id uuid,order_id uuid,trip_id uuid,amount numeric);
CREATE UNIQUE INDEX rider_earnings_order_unique ON rider_earnings(order_id) WHERE trip_id IS NULL;
CREATE UNIQUE INDEX rider_earnings_trip_unique ON rider_earnings(trip_id) WHERE trip_id IS NOT NULL;
INSERT INTO users VALUES('00000000-0000-4000-8000-000000000005','rider',true);
\i backend/migrations/065_trip_cancellation.sql
-- Simulate a historical completed delivery whose old separate earning write was lost.
DO $$ DECLARE o orders; BEGIN
 o:=test_order(1);
 UPDATE orders SET rider_id='00000000-0000-4000-8000-000000000005',status='packed' WHERE id=o.id;
 UPDATE orders SET status='out_for_delivery',picked_up_at=checkout_clock() WHERE id=o.id;
 UPDATE orders SET status='delivered',delivered_at=checkout_clock() WHERE id=o.id;
END $$;
-- Exercise migration rollout with an active legacy delivery, including
-- installations missing the column entirely (the reported Supabase schema).
CREATE TEMP TABLE test_legacy_delivery(id uuid,expected_code text);
DO $$ DECLARE o orders; BEGIN
 UPDATE products SET stock_quantity=100;
 o:=test_order(1);
 UPDATE orders SET rider_id='00000000-0000-4000-8000-000000000005',status='packed' WHERE id=o.id;
 UPDATE orders SET status='out_for_delivery',picked_up_at=checkout_clock(),delivery_otp='5432' WHERE id=o.id;
 INSERT INTO test_legacy_delivery VALUES(o.id,'5432');
END $$;
\if :missing_delivery_otp
ALTER TABLE orders DROP COLUMN delivery_otp;
UPDATE test_legacy_delivery SET expected_code=null;
\endif
\i backend/migrations/079_private_storefronts_delivery_codes.sql
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM test_legacy_delivery t LEFT JOIN delivery_codes c ON c.scope_id=t.id
   WHERE c.code IS NULL OR c.code !~ '^[0-9]{4}$' OR (t.expected_code IS NOT NULL AND c.code<>t.expected_code)) THEN
  RAISE EXCEPTION 'Active delivery code migration failed'; END IF;
 IF EXISTS(SELECT 1 FROM orders WHERE delivery_otp IS NOT NULL) THEN
  RAISE EXCEPTION 'Legacy codes were not cleared'; END IF;
END $$;
\i backend/migrations/080_atomic_order_financial_effects.sql
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM orders o WHERE status='delivered' AND rider_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM rider_earnings e WHERE e.order_id=o.id)) THEN
  RAISE EXCEPTION 'Historical missing earning not recovered'; END IF;
END $$;
GRANT ALL ON rider_earnings TO service_role;
GRANT EXECUTE ON FUNCTION checkout_clock() TO service_role;
SET ROLE anon;
DO $$ BEGIN
 PERFORM assert_commerce_denied('SELECT payout_bank_account_number FROM stores');
 PERFORM assert_commerce_denied('SELECT pan_number FROM stores');
 PERFORM assert_commerce_denied('SELECT * FROM delivery_codes');
 PERFORM assert_commerce_denied('SELECT * FROM order_refund_jobs');
 PERFORM assert_commerce_denied('SELECT customer_delivery_codes(null::uuid,ARRAY[]::uuid[])');
 PERFORM assert_commerce_denied('SELECT complete_verified_delivery(null::uuid,null::uuid,''1234'')');
 PERFORM name FROM storefronts;
END $$;
RESET ROLE;
SET ROLE service_role;
UPDATE products SET stock_quantity=100,approval_status='approved';
DO $$ DECLARE o orders; code text; result jsonb; n integer; BEGIN
 o:=test_order(1);
 UPDATE orders SET rider_id='00000000-0000-4000-8000-000000000005',status='packed' WHERE id=o.id;
 UPDATE orders SET status='out_for_delivery',picked_up_at=checkout_clock(),delivery_otp='1234' WHERE id=o.id;
 IF (SELECT delivery_otp FROM orders WHERE id=o.id) IS NOT NULL THEN RAISE EXCEPTION 'Code on public order'; END IF;
 SELECT c.code INTO code FROM customer_delivery_codes(o.customer_id,ARRAY[o.id]) c;
 IF code IS NULL THEN RAISE EXCEPTION 'Customer code unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM customer_delivery_codes('00000000-0000-4000-8000-000000000005',ARRAY[o.id])) THEN RAISE EXCEPTION 'Rider obtained customer code'; END IF;
 result:=complete_verified_delivery(o.id,'00000000-0000-4000-8000-000000000005',CASE WHEN code='0000' THEN '0001' ELSE '0000' END);
 IF (result->>'accepted')::boolean OR (SELECT attempts FROM delivery_codes WHERE scope_id=o.id)<>1 THEN RAISE EXCEPTION 'Failed attempt not committed'; END IF;
 result:=complete_verified_delivery(o.id,'00000000-0000-4000-8000-000000000005',code);
 IF NOT(result->>'accepted')::boolean OR (SELECT count(*) FROM rider_earnings WHERE order_id=o.id)<>1 THEN RAISE EXCEPTION 'Delivery/earning missing'; END IF;
 PERFORM complete_verified_delivery(o.id,'00000000-0000-4000-8000-000000000005',code);
 IF (SELECT count(*) FROM rider_earnings WHERE order_id=o.id)<>1 THEN RAISE EXCEPTION 'Duplicate earning'; END IF;
 o:=test_order(1,'online');
 PERFORM settle_checkout_payment(o.id,null,'synthetic-payment');
 UPDATE orders SET status='cancelled' WHERE id=o.id;
 IF NOT EXISTS(SELECT 1 FROM order_refund_jobs WHERE order_id=o.id AND target_paise=round(o.total*100)) THEN RAISE EXCEPTION 'Cancelled paid order has no refund intent'; END IF;
 UPDATE orders SET cancel_reason='retry' WHERE id=o.id;
 IF (SELECT count(*) FROM order_refund_jobs WHERE order_id=o.id)<>1 THEN RAISE EXCEPTION 'Duplicate refund intent'; END IF;
 o:=test_order(1,'online');
 UPDATE orders SET placed_at=checkout_clock()-interval '21 minutes' WHERE id=o.id;
 PERFORM settle_checkout_payment(o.id,null,'synthetic-late-payment');
 IF NOT EXISTS(SELECT 1 FROM order_refund_jobs WHERE order_id=o.id) THEN RAISE EXCEPTION 'Late capture has no refund intent'; END IF;
END $$;
RESET ROLE;
-- A failed financial write must roll back its associated status transition.
CREATE FUNCTION test_reject_earning() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic earning failure'; END $$;
CREATE TRIGGER test_earning_failure BEFORE INSERT ON rider_earnings FOR EACH ROW EXECUTE FUNCTION test_reject_earning();
DO $$ DECLARE o orders; code text; BEGIN
 o:=test_order(1);
 UPDATE orders SET rider_id='00000000-0000-4000-8000-000000000005',status='packed' WHERE id=o.id;
 UPDATE orders SET status='out_for_delivery',picked_up_at=checkout_clock() WHERE id=o.id;
 SELECT c.code INTO code FROM customer_delivery_codes(o.customer_id,ARRAY[o.id]) c;
 BEGIN PERFORM complete_verified_delivery(o.id,'00000000-0000-4000-8000-000000000005',code);
  RAISE EXCEPTION 'Expected failure not raised';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'synthetic earning failure' THEN RAISE; END IF; END;
 IF (SELECT status FROM orders WHERE id=o.id)<>'out_for_delivery' THEN RAISE EXCEPTION 'Delivery committed without earning'; END IF;
END $$;
DROP TRIGGER test_earning_failure ON rider_earnings;
CREATE FUNCTION test_reject_refund() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic refund failure'; END $$;
CREATE TRIGGER test_refund_failure BEFORE INSERT ON order_refund_jobs FOR EACH ROW EXECUTE FUNCTION test_reject_refund();
DO $$ DECLARE o orders; BEGIN
 o:=test_order(1,'online'); PERFORM settle_checkout_payment(o.id,null,'synthetic-rollback-payment');
 BEGIN UPDATE orders SET status='cancelled' WHERE id=o.id; RAISE EXCEPTION 'Expected failure not raised';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'synthetic refund failure' THEN RAISE; END IF; END;
 IF (SELECT status FROM orders WHERE id=o.id)<>'placed' THEN RAISE EXCEPTION 'Cancellation committed without refund intent'; END IF;
END $$;
DROP TRIGGER test_refund_failure ON order_refund_jobs;
SELECT 'private storefront/proof and atomic financial effects passed' AS result;

SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000005';
SET ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM orders WHERE delivery_otp IS NOT NULL) THEN RAISE EXCEPTION 'Assigned rider can read delivery proof'; END IF;
 PERFORM assert_commerce_denied('SELECT code FROM delivery_codes');
 PERFORM assert_commerce_denied('SELECT payout_bank_account_number FROM stores');
END $$;
RESET ROLE;
-- Five invalid attempts are persisted; correct guesses after locking fail.
DO $$ DECLARE o orders; code text; result jsonb; i integer; BEGIN
 o:=test_order(1);
 UPDATE orders SET rider_id='00000000-0000-4000-8000-000000000005',status='packed' WHERE id=o.id;
 UPDATE orders SET status='out_for_delivery',picked_up_at=checkout_clock() WHERE id=o.id;
 SELECT c.code INTO code FROM customer_delivery_codes(o.customer_id,ARRAY[o.id]) c;
 FOR i IN 1..5 LOOP PERFORM complete_verified_delivery(o.id,'00000000-0000-4000-8000-000000000005','0000'); END LOOP;
 result:=complete_verified_delivery(o.id,'00000000-0000-4000-8000-000000000005',code);
 IF result->>'error'<>'CODE_LOCKED' OR (SELECT attempts FROM delivery_codes WHERE scope_id=o.id)<>5 THEN RAISE EXCEPTION 'Code brute-force protection failed'; END IF;
END $$;
-- Late capture on a cancelled shared payment queues its refund in settlement itself.
DO $$ DECLARE t trips; BEGIN
 t:=create_trip_orders('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',35,20,55,
 '[{"store_id":"00000000-0000-4000-8000-000000000010","item_total":10,"commission_amount":1,"items":[{"product_id":"00000000-0000-4000-8000-000000000100","quantity":1,"unit_price_at_order":10}]},
 {"store_id":"00000000-0000-4000-8000-000000000020","item_total":10,"commission_amount":1,"items":[{"product_id":"00000000-0000-4000-8000-000000000200","quantity":1,"unit_price_at_order":10}]}]'::jsonb,null,0,'online',0);
 UPDATE trips SET status='cancelled' WHERE id=t.id;
 PERFORM settle_checkout_payment(null,t.id,'synthetic-late-trip');
 IF NOT EXISTS(SELECT 1 FROM trip_refunds WHERE trip_id=t.id AND target_paise=5500) THEN RAISE EXCEPTION 'Late trip capture lacks durable refund'; END IF;
END $$;
CREATE TABLE customer_notifications(push_sent_at timestamptz,next_attempt_at timestamptz);
CREATE TABLE payout_release_work(completed_at timestamptz);
CREATE TABLE scheduled_work(retry_at timestamptz,next_run_at timestamptz);
\i backend/migrations/077_capacity_observability.sql
\i backend/migrations/081_order_refund_observability.sql
DO $$ DECLARE sample jsonb; BEGIN
 sample:=capacity_snapshot();
 IF (sample->'values'->>'order_refund_backlog')::integer<1 THEN RAISE EXCEPTION 'Order refund queue missing from metrics'; END IF;
 IF (sample->'values'->>'refund_backlog')::integer<(sample->'values'->>'order_refund_backlog')::integer THEN RAISE EXCEPTION 'Combined refund backlog incomplete'; END IF;
END $$;

INSERT INTO users VALUES('00000000-0000-4000-8000-000000000006','admin',true);
DO $$ DECLARE o orders; BEGIN
 SELECT * INTO o FROM orders WHERE status='out_for_delivery' AND rider_id='00000000-0000-4000-8000-000000000005' ORDER BY placed_at DESC LIMIT 1;
 BEGIN PERFORM reissue_delivery_code(o.id,o.rider_id); RAISE EXCEPTION 'Rider reissued code';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Admin required' THEN RAISE; END IF; END;
 PERFORM reissue_delivery_code(o.id,'00000000-0000-4000-8000-000000000006');
 IF NOT EXISTS(SELECT 1 FROM delivery_codes WHERE scope_id=coalesce(o.trip_id,o.id) AND attempts=0) THEN RAISE EXCEPTION 'Code recovery failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM delivery_code_resets WHERE order_id=o.id) THEN RAISE EXCEPTION 'Reissue audit missing'; END IF;
END $$;

DO $$ DECLARE j order_refund_jobs; original_key uuid; BEGIN
 SELECT * INTO j FROM claim_order_refunds() LIMIT 1;
 IF j.id IS NULL THEN RAISE EXCEPTION 'No refund fixture'; END IF;
 original_key:=j.request_key;
 IF save_order_refund(j.id,gen_random_uuid(),jsonb_build_object('request_paise',j.target_paise)) THEN RAISE EXCEPTION 'Stale lease changed refund'; END IF;
 IF NOT save_order_refund(j.id,j.lease_token,jsonb_build_object('request_paise',j.target_paise)) THEN RAISE EXCEPTION 'Current lease rejected'; END IF;
 BEGIN PERFORM save_order_refund(j.id,j.lease_token,jsonb_build_object('request_paise',j.target_paise-1));
  RAISE EXCEPTION 'Frozen amount changed';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Frozen refund amount cannot change' THEN RAISE; END IF; END;
 IF (SELECT request_key FROM order_refund_jobs WHERE id=j.id)<>original_key THEN RAISE EXCEPTION 'Idempotency key changed'; END IF;
 PERFORM save_order_refund(j.id,j.lease_token,jsonb_build_object('status','processing','release',true));
END $$;
