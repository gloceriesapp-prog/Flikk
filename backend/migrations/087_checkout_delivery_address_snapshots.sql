BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Historical addresses cannot be reconstructed reliably. Snapshot new writes
-- only; keep old receipts explicitly on their existing compatibility path.
ALTER TABLE orders ADD COLUMN delivery_address_at_order jsonb;
ALTER TABLE trips ADD COLUMN delivery_address_at_order jsonb;
CREATE FUNCTION public.snapshot_checkout_delivery_address() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a addresses; customer users;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.delivery_address_at_order IS DISTINCT FROM OLD.delivery_address_at_order OR NEW.address_id IS DISTINCT FROM OLD.address_id OR NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN RAISE EXCEPTION 'Order delivery address snapshot is immutable'; END IF;
  RETURN NEW;
 END IF;
 -- Use the same customer→address lock order as address edits/deletion.
 PERFORM 1 FROM users WHERE id=NEW.customer_id FOR SHARE;
 SELECT * INTO a FROM addresses WHERE id=NEW.address_id AND user_id=NEW.customer_id AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery address unavailable'; END IF;
 SELECT * INTO customer FROM users WHERE id=NEW.customer_id;
 NEW.delivery_address_at_order:=jsonb_build_object('label',a.label,'line1',a.line1,'landmark',a.landmark,
  'recipient_name',coalesce(a.recipient_name,customer.name),'recipient_phone',coalesce(a.recipient_phone,customer.phone),
  'delivery_instructions',a.delivery_instructions,'latitude',a.latitude,'longitude',a.longitude);
 RETURN NEW;
END $$;
CREATE TRIGGER orders_delivery_address_snapshot BEFORE INSERT OR UPDATE OF delivery_address_at_order,address_id,customer_id ON orders FOR EACH ROW EXECUTE FUNCTION snapshot_checkout_delivery_address();
CREATE TRIGGER trips_delivery_address_snapshot BEFORE INSERT OR UPDATE OF delivery_address_at_order,address_id,customer_id ON trips FOR EACH ROW EXECUTE FUNCTION snapshot_checkout_delivery_address();
REVOKE ALL ON FUNCTION snapshot_checkout_delivery_address() FROM PUBLIC,anon,authenticated;
COMMIT;
