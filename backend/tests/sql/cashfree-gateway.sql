\set ON_ERROR_STOP on
-- Cashfree gateway rules (migration 20261128090000). Disposable fixture only;
-- no provider calls. Everything rolls back.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated flikk_migrations_tests'; END IF; END $$;
BEGIN;
SET session_replication_role=replica;
INSERT INTO public.zones(id,name,slug,is_active) VALUES('f0000000-0000-4000-8000-000000000001','Gateway test','gateway-test',true);
INSERT INTO public.users(id,phone,role) VALUES ('f0000000-0000-4000-8000-000000000002','+919876001241','customer'),('f0000000-0000-4000-8000-000000000003','+919876001242','store_owner');
INSERT INTO public.addresses(id,user_id,line1,zone_id) VALUES ('f0000000-0000-4000-8000-000000000004','f0000000-0000-4000-8000-000000000002','Test','f0000000-0000-4000-8000-000000000001');
INSERT INTO public.stores(id,owner_user_id,zone_id,name,category,district,is_active,lat,lng) VALUES
 ('f0000000-0000-4000-8000-000000000005','f0000000-0000-4000-8000-000000000003','f0000000-0000-4000-8000-000000000001','Test','grocery','Udupi',true,13.21,74.75);
-- A: paid through Cashfree. B: Cashfree create fails, falls back to Razorpay once.
INSERT INTO public.orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,status,payment_method,placed_at,reservation_expires_at,reservation_release_after)
SELECT id,'f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000005','f0000000-0000-4000-8000-000000000004',10,0,0,10,'placed','online',now(),now()+interval '10 minutes',now()+interval '20 minutes'
FROM unnest(ARRAY['f1000000-0000-4000-8000-00000000000a'::uuid,'f1000000-0000-4000-8000-00000000000b'::uuid]) id;
SET session_replication_role=origin;

DO $$ DECLARE c jsonb; BEGIN
 IF (SELECT payment_gateway FROM platform_settings LIMIT 1) IS DISTINCT FROM 'razorpay' AND EXISTS(SELECT 1 FROM platform_settings) THEN RAISE EXCEPTION 'Gateway must default to razorpay'; END IF;
 -- First claim picks Cashfree for both the order and its session.
 c:=claim_checkout_payment('f0000000-0000-4000-8000-000000000002','order','f1000000-0000-4000-8000-00000000000a','order','cashfree');
 IF (c->>'claimed')::boolean IS NOT TRUE OR c->'session'->>'payment_provider'<>'cashfree' THEN RAISE EXCEPTION 'Cashfree claim failed: %',c; END IF;
 IF (SELECT payment_provider FROM orders WHERE id='f1000000-0000-4000-8000-00000000000a')<>'cashfree' THEN RAISE EXCEPTION 'Order provider not set'; END IF;
 -- Once a session exists the provider is fixed.
 BEGIN PERFORM claim_checkout_payment('f0000000-0000-4000-8000-000000000002','order','f1000000-0000-4000-8000-00000000000a','order','razorpay');
  RAISE EXCEPTION 'Provider changed after first claim'; EXCEPTION WHEN SQLSTATE 'P0410' THEN NULL; END;
 -- Wrong id formats are refused per provider.
 BEGIN PERFORM attach_checkout_provider_order('order','f1000000-0000-4000-8000-00000000000a','order_ABC',1000,'cashfree');
  RAISE EXCEPTION 'Razorpay id attached to Cashfree'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Invalid provider order' THEN RAISE; END IF; END;
 PERFORM attach_checkout_provider_order('order','f1000000-0000-4000-8000-00000000000a','gl_f10000000000400080000000000000a0',1000,'cashfree');
END $$;
-- Settle needs a numeric cf_payment_id and the exact amount; replays are idempotent.
DO $$ DECLARE r jsonb; BEGIN
 BEGIN PERFORM settle_checkout_payment('f1000000-0000-4000-8000-00000000000a',null,'pay_ABC',1000,'INR','gl_f10000000000400080000000000000a0','cashfree');
  RAISE EXCEPTION 'Razorpay payment id settled on Cashfree'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Verified capture details required' THEN RAISE; END IF; END;
 BEGIN PERFORM settle_checkout_payment('f1000000-0000-4000-8000-00000000000a',null,'5114910000',999,'INR','gl_f10000000000400080000000000000a0','cashfree');
  RAISE EXCEPTION 'Wrong amount settled'; EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%amount mismatch%' THEN RAISE; END IF; END;
 r:=settle_checkout_payment('f1000000-0000-4000-8000-00000000000a',null,'5114910000',1000,'INR','gl_f10000000000400080000000000000a0','cashfree');
 IF (r->>'accepted')::boolean IS NOT TRUE OR (r->>'settled_now')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'Cashfree settle failed: %',r; END IF;
 r:=settle_checkout_payment('f1000000-0000-4000-8000-00000000000a',null,'5114910000',1000,'INR','gl_f10000000000400080000000000000a0','cashfree');
 IF (r->>'settled_now')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'Duplicate webhook settled twice'; END IF;
 -- A second success is an incident, not a replacement payment.
 BEGIN PERFORM settle_checkout_payment('f1000000-0000-4000-8000-00000000000a',null,'5114910001',1000,'INR','gl_f10000000000400080000000000000a0','cashfree');
  RAISE EXCEPTION 'Second payment replaced the first'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Payment conflict' THEN RAISE; END IF; END;
 PERFORM record_checkout_payment_incident('order','f1000000-0000-4000-8000-00000000000a','gl_f10000000000400080000000000000a0','5114910001',1000,'INR');
 IF (SELECT payment_provider FROM checkout_payment_incidents WHERE payment_id='5114910001')<>'cashfree' THEN RAISE EXCEPTION 'Incident lost its provider'; END IF;
END $$;
-- A cancelled Cashfree payment queues an automatic refund (not manual).
UPDATE orders SET status='cancelled' WHERE id='f1000000-0000-4000-8000-00000000000a';
DO $$ BEGIN
 IF (SELECT status FROM order_refund_jobs WHERE order_id='f1000000-0000-4000-8000-00000000000a')<>'queued' THEN RAISE EXCEPTION 'Cashfree refund must be automatic'; END IF;
 IF (SELECT refund_status FROM orders WHERE id='f1000000-0000-4000-8000-00000000000a')<>'processing' THEN RAISE EXCEPTION 'Refund status not processing'; END IF;
END $$;
-- Fallback: allowed once, only before a provider order is attached.
DO $$ BEGIN
 PERFORM claim_checkout_payment('f0000000-0000-4000-8000-000000000002','order','f1000000-0000-4000-8000-00000000000b','order','cashfree');
 PERFORM switch_checkout_provider('order','f1000000-0000-4000-8000-00000000000b','cashfree','razorpay');
 IF (SELECT payment_provider||'/'||fallback_from FROM checkout_payment_sessions WHERE target_id='f1000000-0000-4000-8000-00000000000b')<>'razorpay/cashfree'
  OR (SELECT payment_provider FROM orders WHERE id='f1000000-0000-4000-8000-00000000000b')<>'razorpay' THEN RAISE EXCEPTION 'Fallback not recorded'; END IF;
 BEGIN PERFORM switch_checkout_provider('order','f1000000-0000-4000-8000-00000000000b','razorpay','cashfree');
  RAISE EXCEPTION 'Fallback ran twice'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Checkout cannot switch provider' THEN RAISE; END IF; END;
 BEGIN PERFORM switch_checkout_provider('order','f1000000-0000-4000-8000-00000000000a','cashfree','razorpay');
  RAISE EXCEPTION 'Paid checkout switched'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Checkout cannot switch provider' THEN RAISE; END IF; END;
 IF has_function_privilege('authenticated','public.switch_checkout_provider(text,uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'switch must be service only'; END IF;
END $$;
ROLLBACK;
