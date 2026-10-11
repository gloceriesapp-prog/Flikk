-- Persist the full reverse-geocoded map address on each address, and carry it
-- into the immutable per-order delivery snapshot (migration 087), so Track
-- Order / receipts can show exactly where the pin was dropped — not just the
-- user-typed building/street in line1.
--
-- Additive only: new column + CREATE OR REPLACE on two existing functions,
-- adding map_address to each. The snapshot trigger's immutability guard is
-- untouched. Historical rows/orders simply have map_address NULL (same stance
-- migration 087 already took — old snapshots cannot be reconstructed).
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE addresses ADD COLUMN IF NOT EXISTS map_address text;

CREATE OR REPLACE FUNCTION public.manage_customer_address(p_customer uuid,p_action text,p_id uuid DEFAULT null,p_data jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result addresses; replacement uuid; make_default boolean:=coalesce((p_data->>'make_default')::boolean,false);
BEGIN
 PERFORM 1 FROM users WHERE id=p_customer AND role='customer' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Customer required'; END IF;
 IF p_action IN('create','update') THEN
  IF coalesce(btrim(p_data->>'line1'),'')='' OR coalesce(btrim(p_data->>'recipient_name'),'')='' THEN RAISE EXCEPTION 'Address and receiver required'; END IF;
  IF (p_data->>'latitude') IS NULL OR (p_data->>'longitude') IS NULL
   OR (p_data->>'latitude')::numeric NOT BETWEEN -90 AND 90 OR (p_data->>'longitude')::numeric NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid location'; END IF;
 END IF;
 IF p_action='create' THEN
  make_default:=make_default OR NOT EXISTS(SELECT 1 FROM addresses WHERE user_id=p_customer AND deleted_at IS NULL);
  IF make_default THEN UPDATE addresses SET is_default=false WHERE user_id=p_customer AND is_default AND deleted_at IS NULL; END IF;
  INSERT INTO addresses(user_id,zone_id,label,line1,landmark,recipient_name,recipient_phone,delivery_instructions,latitude,longitude,is_default,map_address)
  VALUES(p_customer,(p_data->>'zone_id')::uuid,coalesce(nullif(btrim(p_data->>'label'),''),'Home'),btrim(p_data->>'line1'),nullif(btrim(p_data->>'landmark'),''),
   btrim(p_data->>'recipient_name'),nullif(btrim(p_data->>'recipient_phone'),''),nullif(btrim(p_data->>'delivery_instructions'),''),
   (p_data->>'latitude')::numeric,(p_data->>'longitude')::numeric,make_default,nullif(btrim(p_data->>'map_address'),'')) RETURNING * INTO result;
 ELSIF p_action IN('default','delete','update') THEN
  SELECT * INTO result FROM addresses WHERE id=p_id AND user_id=p_customer AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN null; END IF;
  IF p_action='update' THEN
   UPDATE addresses SET zone_id=coalesce((p_data->>'zone_id')::uuid,zone_id),label=coalesce(nullif(btrim(p_data->>'label'),''),'Home'),
    line1=btrim(p_data->>'line1'),landmark=nullif(btrim(p_data->>'landmark'),''),recipient_name=btrim(p_data->>'recipient_name'),
    recipient_phone=nullif(btrim(p_data->>'recipient_phone'),''),delivery_instructions=nullif(btrim(p_data->>'delivery_instructions'),''),
    latitude=(p_data->>'latitude')::numeric,longitude=(p_data->>'longitude')::numeric,map_address=nullif(btrim(p_data->>'map_address'),'')
   WHERE id=p_id RETURNING * INTO result;
  ELSIF p_action='default' THEN
   UPDATE addresses SET is_default=false WHERE user_id=p_customer AND is_default AND deleted_at IS NULL;
   UPDATE addresses SET is_default=true WHERE id=p_id RETURNING * INTO result;
  ELSE
   UPDATE addresses SET deleted_at=now(),is_default=false WHERE id=p_id RETURNING * INTO result;
   IF NOT EXISTS(SELECT 1 FROM addresses WHERE user_id=p_customer AND deleted_at IS NULL AND is_default) THEN
    SELECT id INTO replacement FROM addresses WHERE user_id=p_customer AND deleted_at IS NULL ORDER BY id LIMIT 1;
    UPDATE addresses SET is_default=true WHERE id=replacement;
   END IF;
  END IF;
 ELSE RAISE EXCEPTION 'Invalid address action'; END IF;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION manage_customer_address(uuid,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION manage_customer_address(uuid,text,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.snapshot_checkout_delivery_address() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a addresses; customer users;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.delivery_address_at_order IS DISTINCT FROM OLD.delivery_address_at_order OR NEW.address_id IS DISTINCT FROM OLD.address_id OR NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN RAISE EXCEPTION 'Order delivery address snapshot is immutable'; END IF;
  RETURN NEW;
 END IF;
 PERFORM 1 FROM users WHERE id=NEW.customer_id FOR SHARE;
 SELECT * INTO a FROM addresses WHERE id=NEW.address_id AND user_id=NEW.customer_id AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Delivery address unavailable'; END IF;
 SELECT * INTO customer FROM users WHERE id=NEW.customer_id;
 NEW.delivery_address_at_order:=jsonb_build_object('label',a.label,'line1',a.line1,'landmark',a.landmark,
  'recipient_name',coalesce(a.recipient_name,customer.name),'recipient_phone',coalesce(a.recipient_phone,customer.phone),
  'delivery_instructions',a.delivery_instructions,'latitude',a.latitude,'longitude',a.longitude,'map_address',a.map_address);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION snapshot_checkout_delivery_address() FROM PUBLIC,anon,authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
