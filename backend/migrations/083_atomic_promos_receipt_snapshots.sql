BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
ALTER TABLE order_items ADD COLUMN product_name_at_order text,ADD COLUMN product_image_at_order text;
CREATE FUNCTION public.snapshot_receipt_product() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 SELECT name,image_url INTO NEW.product_name_at_order,NEW.product_image_at_order FROM products WHERE id=NEW.product_id;
 IF NEW.product_name_at_order IS NULL THEN RAISE EXCEPTION 'Receipt product unavailable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER order_items_receipt_snapshot BEFORE INSERT ON order_items FOR EACH ROW EXECUTE FUNCTION snapshot_receipt_product();
-- Lock the promotion inside the checkout transaction. HTTP validation is
-- advisory; cap, expiry, customer uniqueness and exact discount are final here.
CREATE FUNCTION public.guard_promo_redemption() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p promo_codes; items numeric; expected numeric; payer uuid;
BEGIN
 SELECT * INTO p FROM promo_codes WHERE id=NEW.promo_code_id FOR UPDATE;
 IF NOT FOUND OR NOT p.is_active OR (p.expires_at IS NOT NULL AND p.expires_at<=clock_timestamp()) THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion is unavailable or expired'; END IF;
 IF p.usage_limit IS NOT NULL AND p.times_used>=p.usage_limit THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion usage limit reached'; END IF;
 IF NEW.trip_id IS NOT NULL THEN SELECT item_total,customer_id INTO items,payer FROM trips WHERE id=NEW.trip_id;
 ELSE SELECT item_total,customer_id INTO items,payer FROM orders WHERE id=NEW.order_id; END IF;
 IF payer IS DISTINCT FROM NEW.customer_id OR items IS NULL OR items<p.min_order_value THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion does not qualify for this order'; END IF;
 expected:=CASE WHEN p.discount_type='flat' THEN p.discount_value ELSE items*p.discount_value/100 END;
 expected:=round(least(items,expected,coalesce(p.max_discount_amount,expected)),2);
 IF NEW.discount_amount IS DISTINCT FROM expected THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion price changed; refresh checkout'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER promo_redemptions_final_guard BEFORE INSERT ON promo_redemptions FOR EACH ROW EXECUTE FUNCTION guard_promo_redemption();
CREATE FUNCTION public.release_abandoned_promotion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE redemption promo_redemptions;
BEGIN
 IF NEW.status<>'cancelled' OR OLD.status='cancelled' OR NEW.razorpay_payment_id IS NOT NULL THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='orders' THEN
  IF NEW.trip_id IS NOT NULL OR NEW.payment_method<>'online' THEN RETURN NEW; END IF;
  SELECT * INTO redemption FROM promo_redemptions WHERE order_id=NEW.id;
 ELSE
  -- Trips have no payment-method field: require all legs to be unpaid online.
  IF EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.id AND (payment_method<>'online' OR razorpay_payment_id IS NOT NULL)) THEN RETURN NEW; END IF;
  SELECT * INTO redemption FROM promo_redemptions WHERE trip_id=NEW.id;
 END IF;
 IF NOT FOUND THEN RETURN NEW; END IF;
 PERFORM 1 FROM promo_codes WHERE id=redemption.promo_code_id FOR UPDATE;
 DELETE FROM promo_redemptions WHERE promo_code_id=redemption.promo_code_id AND customer_id=redemption.customer_id
  AND order_id IS NOT DISTINCT FROM redemption.order_id AND trip_id IS NOT DISTINCT FROM redemption.trip_id;
 IF FOUND THEN UPDATE promo_codes SET times_used=greatest(0,times_used-1) WHERE id=redemption.promo_code_id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER orders_release_unpaid_promotion AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION release_abandoned_promotion();
CREATE TRIGGER trips_release_unpaid_promotion AFTER UPDATE OF status ON trips FOR EACH ROW EXECUTE FUNCTION release_abandoned_promotion();
REVOKE ALL ON FUNCTION snapshot_receipt_product(),guard_promo_redemption(),release_abandoned_promotion() FROM PUBLIC,anon,authenticated;
COMMIT;
