-- Admin order control. Requires 001..107.
-- 1. admin_order_actions: append-only audit of every risky admin order write
--    (order/trip, action, from/to, reason, admin email, time). Written only by
--    the SECURITY DEFINER functions below, in the same transaction as the write.
-- 2. admin_assign_order_rider(order, rider, email): manual assignment. A trip
--    leg goes through assign_trip_rider (107, trip advisory lock, refuses a
--    trip that already has another rider) so every live leg gets the same
--    rider; a single order keeps the guarded packed + unassigned update.
-- 3. Cancellation origin: orders.cancelled_by (who cancelled) and, for a
--    multi-store trip cancelled because of one leg, trips.cancel_origin_order_id
--    / cancel_origin_store_id / cancelled_by. cancel_trip_from_leg(order,
--    reason, role) wraps cancel_customer_trip (065: cancels every pre-pickup
--    leg, releases stock, queues the combined refund) and records the origin.
-- 4. Admin order actions, each under the order/trip advisory lock
--    (hashtextextended(scope,790), as in 089/103/107) and audited:
--    admin_cancel_order          placed/packed only. A trip leg cancels the
--                                whole trip through cancel_trip_from_leg; a
--                                single order takes the same status write as a
--                                partner reject, so finish_checkout_stock
--                                releases stock, queue_cancelled_order_refund
--                                starts the refund and
--                                record_customer_order_notification tells the
--                                customer.
--    admin_advance_order_status  placed->packed, packed->out_for_delivery (the
--                                latter needs an assigned rider). Delivery is
--                                never completed by admin: it stays code-verified.
--    admin_unassign_rider        pre-pickup only; clears the rider from every
--                                live leg and resets dispatch so the worker
--                                offers it again.
--    admin_reassign_rider        pre-pickup only; moves every live leg to the
--                                new rider.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE IF NOT EXISTS public.admin_order_actions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid REFERENCES public.orders(id),
 trip_id uuid REFERENCES public.trips(id),
 action text NOT NULL CHECK(action IN('assign_rider','unassign_rider','reassign_rider','cancel','advance_status',
  'reissue_delivery_code','trip_failure_refund')),
 from_value text,
 to_value text,
 reason text CHECK(reason IS NULL OR length(reason)<=300),
 admin_email text NOT NULL CHECK(length(admin_email) BETWEEN 3 AND 320),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(order_id IS NOT NULL OR trip_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS admin_order_actions_order ON public.admin_order_actions(order_id,created_at);
CREATE INDEX IF NOT EXISTS admin_order_actions_trip ON public.admin_order_actions(trip_id,created_at);
ALTER TABLE public.admin_order_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_order_actions FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.admin_order_actions TO service_role;

CREATE OR REPLACE FUNCTION public.record_admin_order_action(p_order uuid,p_trip uuid,p_action text,p_from text,p_to text,p_reason text,p_admin_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF coalesce(length(btrim(p_admin_email)),0) NOT BETWEEN 3 AND 320 THEN RAISE EXCEPTION USING errcode='P0422',message='Admin email required'; END IF;
 INSERT INTO admin_order_actions(order_id,trip_id,action,from_value,to_value,reason,admin_email)
 VALUES(p_order,p_trip,p_action,p_from,p_to,nullif(btrim(p_reason),''),lower(btrim(p_admin_email)));
END $function$
;
REVOKE ALL ON FUNCTION public.record_admin_order_action(uuid,uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_order_action(uuid,uuid,text,text,text,text,text) TO service_role;

-- Raises unless p_rider (users.id) is an approved rider with an active account.
CREATE OR REPLACE FUNCTION public.admin_assert_assignable_rider(p_rider uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM riders r JOIN users u ON u.id=r.user_id
  WHERE r.user_id=p_rider AND r.is_active AND u.role='rider' AND u.is_approved) THEN
  RAISE EXCEPTION USING errcode='P0422',message='Rider is not an approved, active rider'; END IF;
END $function$
;
REVOKE ALL ON FUNCTION public.admin_assert_assignable_rider(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assert_assignable_rider(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_assign_order_rider(p_order uuid,p_rider uuid,p_admin_email text)
 RETURNS SETOF orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE o orders; n integer;
BEGIN
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Order not found'; END IF;
 PERFORM admin_assert_assignable_rider(p_rider);
 IF o.trip_id IS NOT NULL THEN
  -- Same trip lock and split-rider refusal (P0409) as rider accept.
  RETURN QUERY SELECT * FROM assign_trip_rider(o.trip_id,p_rider);
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended(o.id::text,790));
  RETURN QUERY UPDATE orders SET rider_id=p_rider WHERE id=p_order AND status='packed' AND rider_id IS NULL RETURNING *;
 END IF;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n>0 THEN PERFORM record_admin_order_action(o.id,o.trip_id,'assign_rider',NULL,p_rider::text,NULL,p_admin_email); END IF;
END $function$
;
REVOKE ALL ON FUNCTION public.admin_assign_order_rider(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_order_rider(uuid,uuid,text) TO service_role;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS cancelled_by text,
 ADD COLUMN IF NOT EXISTS cancel_origin_order_id uuid REFERENCES public.orders(id),
 ADD COLUMN IF NOT EXISTS cancel_origin_store_id uuid REFERENCES public.stores(id);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='orders_cancelled_by_check') THEN
  ALTER TABLE public.orders ADD CONSTRAINT orders_cancelled_by_check
   CHECK(cancelled_by IS NULL OR cancelled_by IN('customer','store_owner','rider','admin','system')) NOT VALID;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='trips_cancelled_by_check') THEN
  ALTER TABLE public.trips ADD CONSTRAINT trips_cancelled_by_check
   CHECK(cancelled_by IS NULL OR cancelled_by IN('customer','store_owner','rider','admin','system')) NOT VALID;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_trip_from_leg(p_order uuid,p_reason text,p_actor_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE o orders; already boolean; result jsonb;
BEGIN
 IF p_actor_role IS NULL OR p_actor_role NOT IN('customer','store_owner','rider','admin','system') THEN
  RAISE EXCEPTION USING errcode='P0422',message='Unknown cancelling role'; END IF;
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND OR o.trip_id IS NULL THEN RAISE EXCEPTION USING errcode='P0404',message='Trip leg not found'; END IF;
 -- Advisory lock first, then trip -> legs -> products inside cancel_customer_trip
 -- (the same order fail_assigned_trip uses).
 PERFORM pg_advisory_xact_lock(hashtextextended(o.trip_id::text,790));
 SELECT status='cancelled' INTO already FROM trips WHERE id=o.trip_id;
 result:=cancel_customer_trip(o.trip_id,o.customer_id,p_reason);
 IF result->>'outcome'='cancelled' AND NOT coalesce(already,false) THEN
  UPDATE trips SET cancelled_by=p_actor_role,cancel_origin_order_id=o.id,cancel_origin_store_id=o.store_id WHERE id=o.trip_id;
  UPDATE orders SET cancelled_by=p_actor_role WHERE trip_id=o.trip_id AND status='cancelled' AND cancelled_by IS NULL;
 END IF;
 RETURN result||jsonb_build_object('trip_id',o.trip_id,'origin_order_id',o.id,'origin_store_id',o.store_id);
END $function$
;
REVOKE ALL ON FUNCTION public.cancel_trip_from_leg(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trip_from_leg(uuid,text,text) TO service_role;

-- Reason for an admin write: required, 3-300 characters.
CREATE OR REPLACE FUNCTION public.admin_assert_reason(p_reason text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF coalesce(length(btrim(p_reason)),0) NOT BETWEEN 3 AND 300 THEN
  RAISE EXCEPTION USING errcode='P0422',message='Reason must be 3-300 characters'; END IF;
 RETURN btrim(p_reason);
END $function$
;
REVOKE ALL ON FUNCTION public.admin_assert_reason(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assert_reason(text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_cancel_order(p_order uuid,p_reason text,p_admin_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE o orders; why text:=admin_assert_reason(p_reason); result jsonb; scope uuid;
BEGIN
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Order not found'; END IF;
 scope:=coalesce(o.trip_id,o.id);
 PERFORM pg_advisory_xact_lock(hashtextextended(scope::text,790));
 IF o.trip_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=o.trip_id AND status IN('placed','packed')) THEN
   RAISE EXCEPTION USING errcode='P0409',message='Nothing left to cancel in this trip'; END IF;
  -- The whole trip: one shared payment is refunded once, never per leg.
  result:=cancel_trip_from_leg(o.id,why,'admin');
  IF result->>'outcome'<>'cancelled' THEN
   RAISE EXCEPTION USING errcode='P0409',message='This trip can no longer be cancelled after pickup'; END IF;
 ELSE
  SELECT * INTO o FROM orders WHERE id=p_order FOR UPDATE;
  IF o.status NOT IN('placed','packed') THEN
   RAISE EXCEPTION USING errcode='P0409',message='Only a placed or packed order can be cancelled'; END IF;
  -- Same lock order as payment settlement, expiry and trip cancellation.
  PERFORM 1 FROM products WHERE id IN(SELECT product_id FROM inventory_reservations
   WHERE order_id=o.id AND state IN('held','committed')) ORDER BY id FOR UPDATE;
  UPDATE orders SET status='cancelled',cancel_reason=why,cancelled_by='admin' WHERE id=o.id;
  result:=jsonb_build_object('outcome','cancelled');
 END IF;
 PERFORM record_admin_order_action(o.id,o.trip_id,'cancel',o.status,'cancelled',why,p_admin_email);
 RETURN result||jsonb_build_object('order_id',o.id,'trip_id',o.trip_id,
  'cancelled_order_ids',(SELECT coalesce(jsonb_agg(id ORDER BY id),'[]') FROM orders WHERE coalesce(trip_id,id)=scope AND status='cancelled'));
END $function$
;
REVOKE ALL ON FUNCTION public.admin_cancel_order(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_order(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_advance_order_status(p_order uuid,p_to text,p_reason text,p_admin_email text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE o orders; why text:=admin_assert_reason(p_reason); prev text;
BEGIN
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Order not found'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(o.trip_id,o.id)::text,790));
 SELECT * INTO o FROM orders WHERE id=p_order FOR UPDATE;
 prev:=o.status;
 IF NOT ((prev='placed' AND p_to='packed') OR (prev='packed' AND p_to='out_for_delivery')) THEN
  RAISE EXCEPTION USING errcode='P0409',message=format('Admin cannot move an order from %s to %s',prev,p_to); END IF;
 IF p_to='out_for_delivery' AND o.rider_id IS NULL THEN
  RAISE EXCEPTION USING errcode='P0409',message='Assign a rider before marking the order picked up'; END IF;
 -- guard_checkout_order still refuses an unpaid online order (P1001) and a
 -- trip pickup beside an unpacked sibling (P0409).
 IF p_to='packed' THEN UPDATE orders SET status='packed',packed_at=now() WHERE id=o.id RETURNING * INTO o;
 ELSE UPDATE orders SET status='out_for_delivery',picked_up_at=now() WHERE id=o.id RETURNING * INTO o; END IF;
 PERFORM record_admin_order_action(o.id,o.trip_id,'advance_status',prev,p_to,why,p_admin_email);
 RETURN o;
END $function$
;
REVOKE ALL ON FUNCTION public.admin_advance_order_status(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_advance_order_status(uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_unassign_rider(p_order uuid,p_reason text,p_admin_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE o orders; why text:=admin_assert_reason(p_reason); scope uuid; prev uuid; ids jsonb;
BEGIN
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Order not found'; END IF;
 scope:=coalesce(o.trip_id,o.id);
 PERFORM pg_advisory_xact_lock(hashtextextended(scope::text,790));
 PERFORM 1 FROM orders WHERE coalesce(trip_id,id)=scope ORDER BY id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM orders WHERE coalesce(trip_id,id)=scope AND status IN('out_for_delivery','delivered','failed')) THEN
  RAISE EXCEPTION USING errcode='P0409',message='The rider has already picked up this order'; END IF;
 SELECT rider_id INTO prev FROM orders WHERE coalesce(trip_id,id)=scope AND status IN('placed','packed') AND rider_id IS NOT NULL LIMIT 1;
 IF prev IS NULL THEN RAISE EXCEPTION USING errcode='P0409',message='No rider is assigned'; END IF;
 -- Reset dispatch so the worker's advance_dispatch_offers offers it again.
 WITH cleared AS (
  UPDATE orders SET rider_id=NULL,dispatch_broadcast_at=NULL,dispatch_radius_m=NULL
  WHERE coalesce(trip_id,id)=scope AND status IN('placed','packed') AND rider_id IS NOT NULL RETURNING id
 ) SELECT jsonb_agg(id ORDER BY id) INTO ids FROM cleared;
 PERFORM record_admin_order_action(o.id,o.trip_id,'unassign_rider',prev::text,NULL,why,p_admin_email);
 RETURN jsonb_build_object('order_ids',ids,'previous_rider_id',prev,'trip_id',o.trip_id);
END $function$
;
REVOKE ALL ON FUNCTION public.admin_unassign_rider(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unassign_rider(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_reassign_rider(p_order uuid,p_rider uuid,p_reason text,p_admin_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE o orders; why text:=admin_assert_reason(p_reason); scope uuid; prev uuid; ids jsonb;
BEGIN
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Order not found'; END IF;
 PERFORM admin_assert_assignable_rider(p_rider);
 scope:=coalesce(o.trip_id,o.id);
 PERFORM pg_advisory_xact_lock(hashtextextended(scope::text,790));
 PERFORM 1 FROM orders WHERE coalesce(trip_id,id)=scope ORDER BY id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM orders WHERE coalesce(trip_id,id)=scope AND status IN('out_for_delivery','delivered','failed')) THEN
  RAISE EXCEPTION USING errcode='P0409',message='The rider has already picked up this order'; END IF;
 SELECT rider_id INTO prev FROM orders WHERE coalesce(trip_id,id)=scope AND status IN('placed','packed') AND rider_id IS NOT NULL LIMIT 1;
 IF prev IS NULL THEN RAISE EXCEPTION USING errcode='P0409',message='No rider is assigned; assign one instead'; END IF;
 IF prev=p_rider THEN RAISE EXCEPTION USING errcode='P0409',message='That rider already has this order'; END IF;
 -- Every live leg moves together, so a trip keeps exactly one rider.
 WITH moved AS (
  UPDATE orders SET rider_id=p_rider WHERE coalesce(trip_id,id)=scope AND status IN('placed','packed') RETURNING id
 ) SELECT jsonb_agg(id ORDER BY id) INTO ids FROM moved;
 PERFORM record_admin_order_action(o.id,o.trip_id,'reassign_rider',prev::text,p_rider::text,why,p_admin_email);
 RETURN jsonb_build_object('order_ids',ids,'previous_rider_id',prev,'rider_id',p_rider,'trip_id',o.trip_id);
END $function$
;
REVOKE ALL ON FUNCTION public.admin_reassign_rider(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_rider(uuid,uuid,text,text) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
