\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_checkout_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
\i backend/migrations/087_checkout_delivery_address_snapshots.sql
DO $$ DECLARE o orders;t trips; origin jsonb; BEGIN
 UPDATE addresses SET line1='Original delivery address',recipient_name='Original recipient',recipient_phone='919000000001',latitude=13.271,longitude=74.751 WHERE id='00000000-0000-4000-8000-000000000002';
 PERFORM set_product_pack_stock('00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000111',10);
 o:=create_order('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000002',10,20,1,30,
 jsonb_build_array(jsonb_build_object('product_id','00000000-0000-4000-8000-000000000100','variant_id','00000000-0000-4000-8000-000000000111','quantity',1,'unit_price_at_order',10)),null,0,'cod',0);
 origin:=o.delivery_address_at_order;
 IF origin->>'line1'<>'Original delivery address' OR origin->>'recipient_phone'<>'919000000001' THEN RAISE EXCEPTION 'Missing actual delivery snapshot'; END IF;
 UPDATE addresses SET line1='Address book changed',recipient_phone='919000000002' WHERE id=o.address_id;
 IF (SELECT delivery_address_at_order FROM orders WHERE id=o.id) IS DISTINCT FROM origin THEN RAISE EXCEPTION 'Snapshot changed after address edit'; END IF;
 BEGIN UPDATE orders SET delivery_address_at_order='{}' WHERE id=o.id;RAISE EXCEPTION 'Immutable snapshot was writable';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Order delivery address snapshot is immutable' THEN RAISE; END IF;END;
 UPDATE orders SET status='cancelled' WHERE id=o.id;
 IF (SELECT delivery_address_at_order FROM orders WHERE id=o.id) IS DISTINCT FROM origin THEN RAISE EXCEPTION 'Cancellation changed snapshot'; END IF;
 t:=create_trip_orders('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',20,10,30,
 jsonb_build_array(jsonb_build_object('store_id','00000000-0000-4000-8000-000000000010','item_total',10,'commission_amount',1,'items',
 jsonb_build_array(jsonb_build_object('product_id','00000000-0000-4000-8000-000000000100','variant_id','00000000-0000-4000-8000-000000000111','quantity',1,'unit_price_at_order',10)))),null,0,'cod',0);
 IF t.delivery_address_at_order->>'line1'<>'Address book changed' OR EXISTS(SELECT 1 FROM orders WHERE trip_id=t.id AND delivery_address_at_order IS DISTINCT FROM t.delivery_address_at_order) THEN RAISE EXCEPTION 'Trip and leg snapshot differ'; END IF;
 BEGIN UPDATE trips SET delivery_address_at_order='{}' WHERE id=t.id;RAISE EXCEPTION 'Trip snapshot writable';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Order delivery address snapshot is immutable' THEN RAISE; END IF;END;
 IF has_function_privilege('anon','snapshot_checkout_delivery_address()','EXECUTE') OR has_function_privilege('authenticated','snapshot_checkout_delivery_address()','EXECUTE') THEN RAISE EXCEPTION 'Snapshot trigger exposed'; END IF;
END $$;
