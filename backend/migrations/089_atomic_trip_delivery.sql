-- One proof verifies every live leg at the shared destination, atomically.
CREATE OR REPLACE FUNCTION public.complete_verified_delivery(p_order uuid,p_rider uuid,p_code text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o orders; c delivery_codes; scope uuid;
BEGIN
 SELECT coalesce(trip_id,id) INTO scope FROM orders WHERE id=p_order AND rider_id=p_rider;
 IF scope IS NULL THEN RETURN jsonb_build_object('accepted',false,'error','ORDER_NOT_FOUND'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(scope::text,790));
 PERFORM id FROM orders WHERE coalesce(trip_id,id)=scope ORDER BY id FOR UPDATE;
 SELECT * INTO o FROM orders WHERE id=p_order AND rider_id=p_rider;
 IF o.status='delivered' THEN RETURN jsonb_build_object('accepted',true,'order',to_jsonb(o)); END IF;
 IF o.status<>'out_for_delivery' OR EXISTS(SELECT 1 FROM orders WHERE coalesce(trip_id,id)=scope
  AND status NOT IN('delivered','cancelled','failed') AND (rider_id IS DISTINCT FROM p_rider OR status<>'out_for_delivery')) THEN
  RETURN jsonb_build_object('accepted',false,'error','ORDER_CHANGED'); END IF;
 SELECT * INTO c FROM delivery_codes WHERE scope_id=scope FOR UPDATE;
 IF NOT FOUND OR c.consumed_at IS NOT NULL OR c.expires_at<=now() THEN
  RETURN jsonb_build_object('accepted',false,'error','CODE_EXPIRED'); END IF;
 IF c.attempts>=5 THEN RETURN jsonb_build_object('accepted',false,'error','CODE_LOCKED'); END IF;
 IF p_code IS DISTINCT FROM c.code THEN
  UPDATE delivery_codes SET attempts=attempts+1 WHERE scope_id=scope;
  RETURN jsonb_build_object('accepted',false,'error','INVALID_OTP');
 END IF;
 UPDATE orders SET status='delivered',delivered_at=now()
 WHERE coalesce(trip_id,id)=scope AND status='out_for_delivery';
 UPDATE delivery_codes SET consumed_at=now() WHERE scope_id=scope;
 SELECT * INTO o FROM orders WHERE id=p_order;
 RETURN jsonb_build_object('accepted',true,'order',to_jsonb(o));
END $$;
REVOKE ALL ON FUNCTION complete_verified_delivery(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION complete_verified_delivery(uuid,uuid,text) TO service_role;
