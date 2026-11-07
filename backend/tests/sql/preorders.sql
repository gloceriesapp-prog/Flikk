\set ON_ERROR_STOP on
-- Migration 20261106090000: pre-order products only with a delivery slot,
-- the store's longer acceptance window, preparation by the slot, and rider
-- dispatch held until shortly before it.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000190a0','Preorder zone','preorder-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000190c1','+919999190001','customer',true),
 ('00000000-0000-4000-8000-0000000190d1','+919999190002','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000190f1','00000000-0000-4000-8000-0000000190d1','00000000-0000-4000-8000-0000000190a0','Idli shop','grocery','Test',12.97,77.59);
INSERT INTO addresses(id,user_id,line1,zone_id,latitude,longitude) VALUES('00000000-0000-4000-8000-0000000190b1','00000000-0000-4000-8000-0000000190c1','1 Idli Road','00000000-0000-4000-8000-0000000190a0',12.97,77.59);
INSERT INTO products(id,store_id,name,unit,price,category,approval_status,is_in_stock,stock_status,stock_tracking_enabled,stock_quantity,preorder_enabled,preorder_min_qty) VALUES
 ('00000000-0000-4000-8000-000000019011','00000000-0000-4000-8000-0000000190f1','Idli','4 pcs',40,'Breakfast','approved',true,'in_stock',true,500,true,10),
 ('00000000-0000-4000-8000-000000019012','00000000-0000-4000-8000-0000000190f1','Milk','500 ml',30,'Dairy','approved',true,'in_stock',true,500,false,1);
SET LOCAL session_replication_role=origin;
-- Store hours, zones and distance have their own tests.
CREATE OR REPLACE FUNCTION checkout_assert_store(customer uuid, address_id uuid, store_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT $$;

CREATE FUNCTION pg_temp.attempt(attempt uuid, product uuid, price numeric, qty integer, slot timestamptz, method text DEFAULT 'cod') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT create_checkout_attempt('00000000-0000-4000-8000-0000000190c1',attempt,'fp','order',
  jsonb_build_object('p_store_id','00000000-0000-4000-8000-0000000190f1','p_address_id','00000000-0000-4000-8000-0000000190b1',
   'p_item_total',price*qty,'p_delivery_fee',0,'p_commission_amount',0,'p_total',price*qty,'p_discount_amount',0,'p_handling_fee',0,
   'p_payment_method',method,'p_items',jsonb_build_array(jsonb_build_object('product_id',product,'quantity',qty,'unit_price_at_order',price)))
  || CASE WHEN slot IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('p_deliver_from',slot,'p_deliver_until',slot+interval '2 hours') END)
$f$;

DO $$
DECLARE slot timestamptz := date_trunc('hour', now()) + interval '2 days'; o jsonb; row orders;
BEGIN
 BEGIN
  PERFORM pg_temp.attempt('00000000-0000-4000-8000-000000019101','00000000-0000-4000-8000-000000019011',40,10,NULL);
  RAISE EXCEPTION 'Pre-order product sold for instant delivery';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN
  PERFORM pg_temp.attempt('00000000-0000-4000-8000-000000019102','00000000-0000-4000-8000-000000019012',30,1,slot);
  RAISE EXCEPTION 'Instant product given a pre-order slot';
 EXCEPTION WHEN serialization_failure THEN NULL; END;

 o := pg_temp.attempt('00000000-0000-4000-8000-000000019103','00000000-0000-4000-8000-000000019011',40,10,slot) -> 'result';
 SELECT * INTO row FROM orders WHERE id=(o->>'id')::uuid;
 IF row.deliver_from<>slot OR (o->>'deliver_from')::timestamptz<>slot THEN RAISE EXCEPTION 'Slot not kept on the order'; END IF;
 IF row.acceptance_deadline_at<>least(row.store_visible_at+interval '3 hours',slot) THEN RAISE EXCEPTION 'COD pre-order acceptance window wrong'; END IF;

 PERFORM partner_accept_order(row.id,'00000000-0000-4000-8000-0000000190f1','00000000-0000-4000-8000-0000000190d1');
 SELECT * INTO row FROM orders WHERE id=row.id;
 IF row.accepted_at IS NULL OR row.preparation_deadline_at<>slot THEN RAISE EXCEPTION 'Pre-order not prepared for its slot'; END IF;
 IF EXISTS(SELECT 1 FROM advance_dispatch_offers(100,row.id)) THEN RAISE EXCEPTION 'Rider offered a pre-order days early'; END IF;
 UPDATE orders SET accepted_at=now()-interval '1 minute', deliver_from=now()+interval '30 minutes', deliver_until=now()+interval '150 minutes' WHERE id=row.id;
 IF NOT EXISTS(SELECT 1 FROM advance_dispatch_offers(100,row.id)) THEN RAISE EXCEPTION 'Due pre-order not offered to riders'; END IF;

 -- Online: the window starts once payment makes it visible to the store.
 o := pg_temp.attempt('00000000-0000-4000-8000-000000019104','00000000-0000-4000-8000-000000019011',40,10,slot,'online') -> 'result';
 IF (SELECT acceptance_deadline_at FROM orders WHERE id=(o->>'id')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'Unpaid pre-order visible to store'; END IF;
 UPDATE orders SET provider_payment_id='pay_1' WHERE id=(o->>'id')::uuid;
 SELECT * INTO row FROM orders WHERE id=(o->>'id')::uuid;
 IF row.acceptance_deadline_at<>least(row.store_visible_at+interval '3 hours',slot) THEN RAISE EXCEPTION 'Paid pre-order acceptance window wrong'; END IF;
 -- The accepted one waits for a later day again: only the unaccepted one is stuck.
 UPDATE orders SET deliver_from=slot, deliver_until=slot+interval '2 hours', dispatch_broadcast_at=NULL WHERE accepted_at IS NOT NULL;
 IF (admin_attention_counts(now()+interval '1 hour')->>'stuckOrders')::int<>1 THEN RAISE EXCEPTION 'Stuck count should hold only the unaccepted pre-order'; END IF;
END $$;
-- Migration 20261106120000: notice is same day (0) to 4 days.
DO $$ BEGIN
 IF (SELECT column_default FROM information_schema.columns WHERE table_name='products' AND column_name='preorder_lead_days')<>'0' THEN
  RAISE EXCEPTION 'New pre-order products should default to same day'; END IF;
 BEGIN
  UPDATE products SET preorder_lead_days=5 WHERE id='00000000-0000-4000-8000-000000019011';
  RAISE EXCEPTION 'Notice beyond the 5-day booking window accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
