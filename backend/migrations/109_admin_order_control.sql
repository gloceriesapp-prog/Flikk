-- Admin order control. Requires 001..107.
-- 1. admin_order_actions: append-only audit of every risky admin order write
--    (order/trip, action, from/to, reason, admin email, time). Written only by
--    the SECURITY DEFINER functions below, in the same transaction as the write.
-- 2. admin_assign_order_rider(order, rider, email): manual assignment. A trip
--    leg goes through assign_trip_rider (107, trip advisory lock, refuses a
--    trip that already has another rider) so every live leg gets the same
--    rider; a single order keeps the guarded packed + unassigned update.
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

NOTIFY pgrst,'reload schema';
COMMIT;
