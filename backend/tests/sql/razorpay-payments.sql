\set ON_ERROR_STOP on
-- Disposable regression fixture after the complete canonical migration chain.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated migration fixture'; END IF; END $$;
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%',message; END IF; END $$;
CREATE FUNCTION pg_temp.rejects(statement text) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN EXECUTE statement; RETURN false; EXCEPTION WHEN OTHERS THEN RETURN true; END $$;
SET LOCAL session_replication_role=replica;
INSERT INTO users(id,phone,role) VALUES
 ('d0000000-0000-4000-8000-000000000001','+910000000001','customer'),
 ('d0000000-0000-4000-8000-000000000002','+910000000002','store_owner');
INSERT INTO zones(id,name,slug,is_active) VALUES ('d0000000-0000-4000-8000-000000000005','Test','test-rzp',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district) VALUES ('d0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000005','Test shop','grocery','Udupi');
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES ('d0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000001','Test address','d0000000-0000-4000-8000-000000000005');
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,reservation_expires_at,reservation_release_after,payment_provider)
SELECT ('d1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004',50,20,5,70,'placed','online',now()+interval '30 minutes',now()+interval '1 hour',CASE WHEN n=4 THEN 'cashfree' ELSE 'razorpay' END FROM generate_series(1,5) n;
SET LOCAL session_replication_role=origin;
DO $$
DECLARE r jsonb; customer uuid:='d0000000-0000-4000-8000-000000000001'; target uuid:='d1000000-0000-4000-8000-000000000001';
BEGIN
 PERFORM pg_temp.assert_true(NOT has_function_privilege('anon','public.settle_checkout_payment(uuid,uuid,text,bigint,text,text,text)','EXECUTE'),'Anonymous settlement allowed');
 PERFORM pg_temp.assert_true(NOT has_function_privilege('authenticated','public.attach_checkout_provider_order(text,uuid,text,bigint,text)','EXECUTE'),'Customer attachment allowed');
 r:=claim_checkout_payment(customer,'order',target,'order');
 PERFORM pg_temp.assert_true((r->>'claimed')::boolean,'First creation was not claimed');
 r:=claim_checkout_payment(customer,'order',target,'order');
 PERFORM pg_temp.assert_true(NOT (r->>'claimed')::boolean,'Unknown creation was reclaimed');
 PERFORM pg_temp.assert_true(pg_temp.rejects($q$SELECT claim_checkout_payment('d0000000-0000-4000-8000-000000000001','order','d1000000-0000-4000-8000-000000000004','order')$q$),'Legacy checkout payable');
 PERFORM pg_temp.assert_true(pg_temp.rejects($q$SELECT attach_checkout_provider_order('order','d1000000-0000-4000-8000-000000000001','order_a',6900)$q$),'Wrong order amount accepted');
 PERFORM attach_checkout_provider_order('order',target,'order_a',7000);
 PERFORM attach_checkout_provider_order('order',target,'order_a',7000);
 PERFORM pg_temp.assert_true(pg_temp.rejects($q$SELECT attach_checkout_provider_order('order','d1000000-0000-4000-8000-000000000001','order_b',7000)$q$),'Provider order overwritten');
 PERFORM pg_temp.assert_true(pg_temp.rejects($q$SELECT settle_checkout_payment('d1000000-0000-4000-8000-000000000001',null,'pay_a',7000,'INR','order_wrong')$q$),'Foreign provider order settled');
 PERFORM pg_temp.assert_true(pg_temp.rejects($q$SELECT settle_checkout_payment('d1000000-0000-4000-8000-000000000001',null,'pay_a',null,'INR','order_a')$q$),'Missing captured amount settled');
 r:=settle_checkout_payment(target,null,'pay_a',7000,'INR','order_a');
 PERFORM pg_temp.assert_true((r->>'accepted')::boolean AND (r->>'settled_now')::boolean,'Captured payment not accepted');
 r:=settle_checkout_payment(target,null,'pay_a',7000,'INR','order_a');
 PERFORM pg_temp.assert_true(NOT (r->>'settled_now')::boolean,'Capture replay not idempotent');
 PERFORM pg_temp.assert_true(pg_temp.rejects($q$SELECT settle_checkout_payment('d1000000-0000-4000-8000-000000000001',null,'pay_extra',7000,'INR','order_a')$q$),'Distinct capture overwrote original');
 PERFORM record_checkout_payment_incident('order',target,'order_a','pay_extra',7000,'INR');
 PERFORM record_checkout_payment_incident('order',target,'order_a','pay_extra',7000,'INR');
 PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM checkout_payment_incidents WHERE target_id=target AND canonical_payment_id='pay_a' AND payment_id='pay_extra' AND status='manual_required'),'Capture incident not durable or not deduplicated');
 PERFORM pg_temp.assert_true(NOT has_table_privilege('authenticated','checkout_payment_incidents','SELECT'),'Private incidents exposed');
 PERFORM resolve_checkout_payment_incident((SELECT id FROM checkout_payment_incidents WHERE payment_id='pay_extra'),'external-refund-ref','operator@example.test');
 PERFORM resolve_checkout_payment_incident((SELECT id FROM checkout_payment_incidents WHERE payment_id='pay_extra'),'external-refund-ref','operator@example.test');
 PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM admin_control_audit WHERE action='payment_incident_resolved'),'Incident resolution not audited exactly once');
 PERFORM pg_temp.assert_true((SELECT status='resolved' FROM checkout_payment_incidents WHERE payment_id='pay_extra'),'Incident resolution not committed');
 UPDATE orders SET status='cancelled' WHERE id=target;
 PERFORM pg_temp.assert_true((SELECT status='queued' FROM order_refund_jobs WHERE order_id=target),'Cancellation did not atomically queue Razorpay refund');
END $$;
-- Cancelled and COD checkouts must record a full refund, never resurrect an order.
DO $$ DECLARE target uuid; r jsonb; BEGIN
 FOR target IN SELECT id FROM orders WHERE id IN('d1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000003') LOOP
  PERFORM claim_checkout_payment('d0000000-0000-4000-8000-000000000001','order',target,'order');
  PERFORM attach_checkout_provider_order('order',target,'order_'||replace(target::text,'-',''),7000);
  IF target='d1000000-0000-4000-8000-000000000002' THEN UPDATE orders SET status='cancelled' WHERE id=target;
  ELSE UPDATE orders SET payment_method='cod' WHERE id=target; END IF;
  r:=settle_checkout_payment(target,null,'pay_'||replace(target::text,'-',''),7000,'INR','order_'||replace(target::text,'-',''));
  PERFORM pg_temp.assert_true(NOT (r->>'accepted')::boolean,'Late capture accepted');
  PERFORM pg_temp.assert_true((SELECT target_paise=7000 AND status='queued' FROM order_refund_jobs WHERE order_id=target),'Late capture refund missing');
 END LOOP;
 PERFORM pg_temp.assert_true((SELECT provider_payment_id IS NULL FROM orders WHERE id='d1000000-0000-4000-8000-000000000003'),'COD incorrectly marked online paid');
 UPDATE orders SET provider_payment_id='cf_original',status='cancelled' WHERE id='d1000000-0000-4000-8000-000000000004';
 PERFORM pg_temp.assert_true((SELECT status='manual_required' FROM order_refund_jobs WHERE order_id='d1000000-0000-4000-8000-000000000004'),'Historical Cashfree refund sent to Razorpay');
END $$;
-- Trip payments lock the parent then legs and share one captured payment.
SET LOCAL session_replication_role=replica;
INSERT INTO trips(id,customer_id,address_id,delivery_fee,item_total,total,status,reservation_expires_at,reservation_release_after)
 VALUES('d2000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000004',30,100,130,'placed',now()+interval '30 minutes',now()+interval '1 hour');
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,trip_id,reservation_expires_at,reservation_release_after)
 SELECT ('d2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004',50,15,5,65,'placed','online','d2000000-0000-4000-8000-000000000001',now()+interval '30 minutes',now()+interval '1 hour' FROM generate_series(2,3) n;
SET LOCAL session_replication_role=origin;
DO $$ DECLARE r jsonb; target uuid:='d2000000-0000-4000-8000-000000000001'; BEGIN
 PERFORM claim_checkout_payment('d0000000-0000-4000-8000-000000000001','trip',target,'order');
 PERFORM attach_checkout_provider_order('trip',target,'order_trip',13000);
 PERFORM pg_temp.assert_true(pg_temp.rejects($q$SELECT settle_checkout_payment(null,'d2000000-0000-4000-8000-000000000001','pay_trip',12999,'INR','order_trip')$q$),'Trip amount mismatch accepted');
 r:=settle_checkout_payment(null,target,'pay_trip',13000,'INR','order_trip');
 PERFORM pg_temp.assert_true((r->>'accepted')::boolean,'Trip capture rejected');
 PERFORM pg_temp.assert_true((SELECT count(*)=2 FROM orders WHERE trip_id=target AND provider_payment_id='pay_trip'),'Trip legs not paid atomically');
 UPDATE trips SET status='cancelled' WHERE id=target;
 PERFORM pg_temp.assert_true((SELECT status='queued' AND target_paise=13000 FROM trip_refunds WHERE trip_id=target),'Trip refund intent not atomic');
 PERFORM pg_temp.assert_true((SELECT count(*)=2 FROM orders WHERE trip_id=target AND refund_status='processing'),'Trip leg refund status not synchronized');
 PERFORM claim_checkout_payment('d0000000-0000-4000-8000-000000000001','order','d1000000-0000-4000-8000-000000000005','order');
 PERFORM pg_temp.assert_true(pg_temp.rejects($q$SELECT attach_checkout_provider_order('order','d1000000-0000-4000-8000-000000000005','order_a',7000)$q$),'Provider order reused across local checkouts');
END $$;
ROLLBACK;
SELECT 'Razorpay settlement/provider fences/idempotency/late captures/refund regression passed' AS result;
