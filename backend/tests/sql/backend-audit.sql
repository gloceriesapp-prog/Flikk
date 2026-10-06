\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_checkout_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
ALTER TABLE stores ADD COLUMN rating numeric;
\i backend/migrations/020_reviews.sql
\i backend/migrations/053_review_reply.sql
\i backend/migrations/088_atomic_customer_reviews.sql
\i backend/migrations/089_atomic_trip_delivery.sql
\i backend/migrations/090_bounded_repeat_purchase_candidates.sql
DO $$ DECLARE o orders;r reviews; old_count bigint; BEGIN
 SELECT * INTO o FROM orders WHERE status='delivered' AND customer_id='00000000-0000-4000-8000-000000000003' LIMIT 1;
 IF o.id IS NULL THEN RAISE EXCEPTION 'Fixture requires delivered order'; END IF;
 r:=submit_customer_review(o.id,o.customer_id,4,'Good');
 IF (SELECT review_count FROM stores WHERE id=o.store_id)<>1 OR (SELECT rating FROM stores WHERE id=o.store_id)<>4 THEN RAISE EXCEPTION 'Aggregate missing'; END IF;
 BEGIN PERFORM submit_customer_review(o.id,o.customer_id,1,null); RAISE EXCEPTION 'Duplicate accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM submit_customer_review(o.id,'00000000-0000-4000-8000-000000000005',1,null); RAISE EXCEPTION 'Non-owner accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
 UPDATE reviews SET owner_reply='Thanks',owner_replied_at=now() WHERE id=r.id;
 BEGIN UPDATE reviews SET rating=1 WHERE id=r.id;RAISE EXCEPTION 'Rating mutation accepted';EXCEPTION WHEN check_violation THEN NULL;END;
 DELETE FROM reviews WHERE id=r.id;
 IF (SELECT review_count FROM stores WHERE id=o.store_id)<>0 THEN RAISE EXCEPTION 'Delete aggregate missing'; END IF;
 IF has_table_privilege('authenticated','reviews','insert') OR has_function_privilege('anon','submit_customer_review(uuid,uuid,int,text)','execute') THEN RAISE EXCEPTION 'Review bypass'; END IF;
END $$;
DO $$ DECLARE t trips; a uuid;b uuid;code text; result jsonb; BEGIN
 SELECT * INTO t FROM trips WHERE status='placed' ORDER BY id LIMIT 1;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Fixture requires trip'; END IF;
 -- Duplicate a live leg into this isolated test trip, without inventing a production order.
 INSERT INTO orders(customer_id,store_id,address_id,status,item_total,delivery_fee,commission_amount,total,payment_method,trip_id,rider_id)
 SELECT customer_id,store_id,address_id,'placed',item_total,delivery_fee,commission_amount,total,'cod',trip_id,'00000000-0000-4000-8000-000000000005' FROM orders WHERE trip_id=t.id LIMIT 1 RETURNING id INTO b;
 UPDATE orders SET status='packed',rider_id='00000000-0000-4000-8000-000000000005' WHERE trip_id=t.id;
 UPDATE orders SET status='out_for_delivery',picked_up_at=checkout_clock() WHERE trip_id=t.id AND id<>b;
 SELECT id INTO a FROM orders WHERE trip_id=t.id AND id<>b LIMIT 1;
 SELECT c.code INTO code FROM delivery_codes c WHERE scope_id=t.id;
 result:=complete_verified_delivery(a,'00000000-0000-4000-8000-000000000005',code);
 IF result->>'error'<>'ORDER_CHANGED' OR EXISTS(SELECT 1 FROM orders WHERE trip_id=t.id AND status='delivered') THEN RAISE EXCEPTION 'Unready trip delivered'; END IF;
 UPDATE orders SET status='out_for_delivery',picked_up_at=checkout_clock() WHERE id=b;
 result:=complete_verified_delivery(a,'00000000-0000-4000-8000-000000000005',CASE WHEN code='0000' THEN '0001' ELSE '0000' END);
 IF result->>'error'<>'INVALID_OTP' OR (SELECT attempts FROM delivery_codes WHERE scope_id=t.id)<>1 THEN RAISE EXCEPTION 'Incorrect proof attempt handling'; END IF;
 CREATE TRIGGER test_atomic_trip_earning BEFORE INSERT ON rider_earnings FOR EACH ROW EXECUTE FUNCTION test_reject_earning();
 BEGIN PERFORM complete_verified_delivery(a,'00000000-0000-4000-8000-000000000005',code);RAISE EXCEPTION 'Expected earning failure';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'synthetic earning failure' THEN RAISE; END IF;END;
 DROP TRIGGER test_atomic_trip_earning ON rider_earnings;
 IF EXISTS(SELECT 1 FROM orders WHERE trip_id=t.id AND status<>'out_for_delivery') OR (SELECT consumed_at FROM delivery_codes WHERE scope_id=t.id) IS NOT NULL THEN RAISE EXCEPTION 'Financial failure partially committed trip'; END IF;

 result:=complete_verified_delivery(a,'00000000-0000-4000-8000-000000000005',code);
 IF NOT (result->>'accepted')::boolean OR EXISTS(SELECT 1 FROM orders WHERE trip_id=t.id AND status<>'delivered') THEN RAISE EXCEPTION 'Trip not atomically delivered: %',result; END IF;
 IF NOT (complete_verified_delivery(b,'00000000-0000-4000-8000-000000000005',code)->>'accepted')::boolean THEN RAISE EXCEPTION 'Delivery retry not idempotent'; END IF;
 IF (SELECT count(*) FROM rider_earnings WHERE trip_id=t.id)<>1 THEN RAISE EXCEPTION 'Trip earnings doubled'; END IF;
END $$;

DO $$ BEGIN
 PERFORM set_product_pack_stock('00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000111',10);
 IF (SELECT count(*) FROM repeat_purchase_candidates('00000000-0000-4000-8000-000000000003',ARRAY['00000000-0000-4000-8000-000000000010'::uuid],1))<>1 THEN RAISE EXCEPTION 'Repeat candidate missing';END IF;
 IF EXISTS(SELECT 1 FROM repeat_purchase_candidates('00000000-0000-4000-8000-000000000005',ARRAY['00000000-0000-4000-8000-000000000010'::uuid],10)) THEN RAISE EXCEPTION 'Repeat history crossed accounts';END IF;
END $$;
