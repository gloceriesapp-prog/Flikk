BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Counts are retail packs, not grams/ml. Bulk produce needs a separately
-- configured sellable-pack SKU; never infer physical stock from pack weight.
ALTER TABLE product_variants ADD COLUMN stock_quantity integer CHECK(stock_quantity>=0);
ALTER TABLE inventory_reservations ADD COLUMN variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL;
CREATE FUNCTION public.set_product_pack_stock(p_product uuid,p_variant uuid,p_quantity integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE counted integer; next_status products.stock_status%TYPE;
BEGIN
 IF p_quantity IS NULL OR p_quantity<0 THEN RAISE EXCEPTION 'Invalid stock count'; END IF;
 PERFORM 1 FROM products WHERE id=p_product FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
 IF p_variant IS NULL THEN
  IF EXISTS(SELECT 1 FROM product_variants WHERE product_id=p_product) THEN RAISE EXCEPTION 'Set counts for each actual pack'; END IF;
  counted:=p_quantity;
 ELSE
  UPDATE product_variants SET stock_quantity=p_quantity WHERE id=p_variant AND product_id=p_product;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pack unavailable'; END IF;
  SELECT coalesce(sum(stock_quantity),0)::integer INTO counted FROM product_variants WHERE product_id=p_product;
 END IF;
 IF counted=0 THEN next_status:='out_of_stock'; ELSIF counted<=10 THEN next_status:='low_stock'; ELSE next_status:='in_stock'; END IF;
 UPDATE products SET stock_tracking_enabled=true,stock_quantity=counted,stock_status=next_status,is_in_stock=counted>0 WHERE id=p_product;
END $$;
CREATE OR REPLACE FUNCTION public.reserve_checkout_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p products; o orders; v product_variants; pack_count integer;
BEGIN
 SELECT * INTO p FROM products WHERE id=NEW.product_id FOR UPDATE;
 IF NOT FOUND OR p.approval_status IS DISTINCT FROM 'approved' OR NOT p.is_in_stock OR p.stock_status='out_of_stock' THEN
  RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Product unavailable'; END IF;
 IF NOT p.stock_tracking_enabled OR p.stock_quantity IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Stock has not been confirmed by the shop'; END IF;
 IF p.stock_quantity<NEW.quantity THEN RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Insufficient stock'; END IF;
 IF NEW.variant_id IS NOT NULL THEN
  SELECT * INTO v FROM product_variants WHERE id=NEW.variant_id AND product_id=p.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Pack unavailable'; END IF;
  SELECT count(*) INTO pack_count FROM product_variants WHERE product_id=p.id;
  IF (pack_count>1 AND v.stock_quantity IS NULL) OR (v.stock_quantity IS NOT NULL AND v.stock_quantity<NEW.quantity) THEN
   RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Selected pack has insufficient or unconfirmed stock'; END IF;
  IF v.stock_quantity IS NOT NULL THEN UPDATE product_variants SET stock_quantity=stock_quantity-NEW.quantity WHERE id=v.id; END IF;
 ELSIF EXISTS(SELECT 1 FROM product_variants WHERE product_id=p.id) THEN
  RAISE EXCEPTION USING ERRCODE='P1002',MESSAGE='Select an actual product pack';
 END IF;
 SELECT * INTO o FROM orders WHERE id=NEW.order_id;
 UPDATE products SET stock_quantity=stock_quantity-NEW.quantity WHERE id=p.id;
 INSERT INTO inventory_reservations(order_item_id,order_id,product_id,variant_id,quantity,state,expires_at)
 VALUES(NEW.id,NEW.order_id,p.id,CASE WHEN v.stock_quantity IS NOT NULL THEN v.id ELSE null END,NEW.quantity,
 CASE WHEN o.payment_method='cod' OR o.razorpay_payment_id IS NOT NULL THEN 'committed' ELSE 'held' END,
 CASE WHEN o.payment_method='online' AND o.razorpay_payment_id IS NULL THEN o.placed_at+interval '20 minutes' ELSE null END);
 RETURN NEW;
END $$;
CREATE FUNCTION public.release_reserved_pack() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.state='released' AND OLD.state IN('held','committed') AND NEW.variant_id IS NOT NULL THEN
  UPDATE product_variants SET stock_quantity=stock_quantity+NEW.quantity WHERE id=NEW.variant_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER inventory_release_variant AFTER UPDATE OF state ON inventory_reservations FOR EACH ROW EXECUTE FUNCTION release_reserved_pack();
CREATE FUNCTION public.protect_reserved_variant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM inventory_reservations WHERE variant_id=OLD.id AND state IN('held','committed')) THEN RAISE EXCEPTION 'Pack is reserved by an active order'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER product_variants_active_reservations BEFORE DELETE ON product_variants FOR EACH ROW EXECUTE FUNCTION protect_reserved_variant();
CREATE TABLE public.product_popularity_daily(product_id uuid NOT NULL REFERENCES products(id),store_id uuid NOT NULL REFERENCES stores(id),day date NOT NULL,quantity bigint NOT NULL,PRIMARY KEY(product_id,day));
ALTER TABLE product_popularity_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON product_popularity_daily FROM PUBLIC,anon,authenticated;
GRANT ALL ON product_popularity_daily TO service_role;
CREATE INDEX product_popularity_store_day ON product_popularity_daily(store_id,day);
CREATE FUNCTION public.record_delivered_popularity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status IN('delivered','failed') AND OLD.status IS DISTINCT FROM NEW.status THEN
  IF NEW.status='delivered' THEN
  INSERT INTO product_popularity_daily(product_id,store_id,day,quantity)
   SELECT product_id,NEW.store_id,(coalesce(NEW.delivered_at,now()) AT TIME ZONE 'Asia/Kolkata')::date,sum(quantity) FROM order_items WHERE order_id=NEW.id GROUP BY product_id
   ON CONFLICT(product_id,day) DO UPDATE SET quantity=product_popularity_daily.quantity+excluded.quantity;
  END IF;
  IF NEW.trip_id IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended(NEW.trip_id::text,790));
   IF NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status NOT IN('delivered','failed')) THEN UPDATE trips SET status=CASE WHEN EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status='failed') THEN 'failed' ELSE 'delivered' END WHERE id=NEW.trip_id; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER orders_delivered_popularity AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION record_delivered_popularity();
INSERT INTO product_popularity_daily(product_id,store_id,day,quantity)
 SELECT i.product_id,o.store_id,(coalesce(o.delivered_at,o.placed_at) AT TIME ZONE 'Asia/Kolkata')::date,sum(i.quantity)
 FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.status='delivered' AND coalesce(o.delivered_at,o.placed_at)>=now()-interval '14 days'
 GROUP BY i.product_id,o.store_id,(coalesce(o.delivered_at,o.placed_at) AT TIME ZONE 'Asia/Kolkata')::date;
CREATE FUNCTION public.popular_customer_product_ids(p_stores uuid[],p_days integer DEFAULT 7) RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT r.product_id FROM product_popularity_daily r JOIN products p ON p.id=r.product_id JOIN stores s ON s.id=p.store_id
 WHERE r.store_id=ANY(p_stores) AND cardinality(p_stores)<=20 AND r.day>=(now() AT TIME ZONE 'Asia/Kolkata')::date-least(greatest(p_days,1),14)
 AND s.is_active AND p.approval_status='approved' AND p.is_in_stock AND p.stock_status<>'out_of_stock'
 GROUP BY r.product_id ORDER BY sum(r.quantity) DESC,r.product_id LIMIT 30;
$$;
REVOKE ALL ON FUNCTION set_product_pack_stock(uuid,uuid,integer),reserve_checkout_stock(),release_reserved_pack(),protect_reserved_variant(),record_delivered_popularity(),popular_customer_product_ids(uuid[],integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION set_product_pack_stock(uuid,uuid,integer),popular_customer_product_ids(uuid[],integer) TO service_role;

ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE trips ADD CONSTRAINT trips_status_check CHECK(status IN('placed','delivered','cancelled','failed'));
CREATE OR REPLACE FUNCTION public.record_atomic_rider_earning() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE fee numeric;
BEGIN
 IF NEW.status NOT IN('delivered','failed') OR OLD.status=NEW.status THEN RETURN NEW; END IF;
 IF NEW.rider_id IS NULL THEN RAISE EXCEPTION 'Completion requires assigned rider'; END IF;
 IF NEW.trip_id IS NULL THEN
  INSERT INTO rider_earnings(rider_id,order_id,amount) VALUES(NEW.rider_id,NEW.id,NEW.delivery_fee) ON CONFLICT DO NOTHING;
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.trip_id::text,790));
  IF NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status NOT IN('delivered','failed')) THEN
   IF EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND rider_id IS DISTINCT FROM NEW.rider_id) THEN
    RAISE EXCEPTION 'Trip has inconsistent rider assignments'; END IF;
   SELECT delivery_fee INTO STRICT fee FROM trips WHERE id=NEW.trip_id;
   INSERT INTO rider_earnings(rider_id,order_id,trip_id,amount) VALUES(NEW.rider_id,NEW.id,NEW.trip_id,fee) ON CONFLICT DO NOTHING;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.fail_assigned_trip(p_trip uuid,p_rider uuid,p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t trips;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_trip::text,790));
 SELECT * INTO t FROM trips WHERE id=p_trip FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=p_trip AND rider_id=p_rider)
 OR EXISTS(SELECT 1 FROM orders WHERE trip_id=p_trip AND(rider_id IS DISTINCT FROM p_rider OR status NOT IN('out_for_delivery','delivered','failed'))) THEN
  RAISE EXCEPTION 'Trip is not ready for a delivery failure'; END IF;
 IF coalesce(length(p_reason),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Failure reason required'; END IF;
 PERFORM 1 FROM orders WHERE trip_id=p_trip ORDER BY id FOR UPDATE;
 UPDATE orders SET status='failed',cancel_reason=p_reason WHERE trip_id=p_trip AND status='out_for_delivery';
 RETURN jsonb_build_object('trip_id',p_trip,'status','failed','refund_review_required',t.razorpay_payment_id IS NOT NULL);
END $$;
-- Failed delivery refunds retain the existing admin-review policy. The
-- approved amount is explicit; no gross shop subtotal guesses for shared pay.
CREATE FUNCTION public.approve_failed_trip_refund(p_trip uuid,p_amount_paise bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t trips;
BEGIN
 SELECT * INTO t FROM trips WHERE id=p_trip FOR UPDATE;
 IF NOT FOUND OR t.status<>'failed' OR t.razorpay_payment_id IS NULL OR p_amount_paise NOT BETWEEN 1 AND round(t.total*100)::bigint THEN RAISE EXCEPTION 'Invalid failed-trip refund'; END IF;
 IF EXISTS(SELECT 1 FROM trip_refunds WHERE trip_id=p_trip AND target_paise<>p_amount_paise) THEN RAISE EXCEPTION 'Refund amount already frozen'; END IF;
 INSERT INTO trip_refunds(trip_id,payment_id,target_paise) VALUES(t.id,t.razorpay_payment_id,p_amount_paise) ON CONFLICT(trip_id) DO NOTHING;
 UPDATE orders SET refund_status='processing' WHERE trip_id=p_trip AND refund_status='none';
END $$;
REVOKE ALL ON FUNCTION fail_assigned_trip(uuid,uuid,text),approve_failed_trip_refund(uuid,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION fail_assigned_trip(uuid,uuid,text),approve_failed_trip_refund(uuid,bigint) TO service_role;

COMMIT;
