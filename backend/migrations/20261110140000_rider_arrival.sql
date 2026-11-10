BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_arrived_at timestamptz;

-- Arrival is one rider-confirmed event per delivery, even with multiple pickups.
-- Leave the order out for delivery until the existing OTP proof completes it.
CREATE OR REPLACE FUNCTION public.mark_rider_arrived(p_order uuid, p_rider uuid) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  delivery_scope uuid;
  target_status text;
  arrived_at timestamptz;
BEGIN
  SELECT coalesce(trip_id, id) INTO delivery_scope
  FROM orders WHERE id = p_order AND rider_id = p_rider;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING errcode = 'P0404', message = 'Order not found';
  END IF;

  -- Match the locking protocol used by pickup, reassignment and delivery proof.
  PERFORM pg_advisory_xact_lock(hashtextextended(delivery_scope::text, 790));
  PERFORM id FROM orders WHERE coalesce(trip_id, id) = delivery_scope ORDER BY id FOR UPDATE;
  SELECT status, rider_arrived_at INTO target_status, arrived_at
  FROM orders WHERE id = p_order AND rider_id = p_rider AND coalesce(trip_id, id) = delivery_scope;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING errcode = 'P0404', message = 'Order not found';
  END IF;

  IF target_status <> 'out_for_delivery' OR EXISTS (
    SELECT 1 FROM orders WHERE coalesce(trip_id, id) = delivery_scope
      AND status NOT IN ('delivered', 'cancelled', 'failed')
      AND (status <> 'out_for_delivery' OR rider_id IS DISTINCT FROM p_rider)
  ) THEN
    RAISE EXCEPTION USING errcode = 'P0409', message = 'All active orders must be picked up before marking arrival';
  END IF;

  arrived_at := coalesce(arrived_at, now());
  UPDATE orders SET rider_arrived_at = arrived_at
  WHERE coalesce(trip_id, id) = delivery_scope AND rider_id = p_rider
    AND status = 'out_for_delivery' AND rider_arrived_at IS NULL;

  RETURN arrived_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_rider_arrived(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_rider_arrived(uuid, uuid) TO service_role;

COMMIT;
