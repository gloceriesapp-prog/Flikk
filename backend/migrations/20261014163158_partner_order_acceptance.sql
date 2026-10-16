BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.orders
 ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
 ADD COLUMN IF NOT EXISTS acceptance_deadline_at timestamptz,
 ADD COLUMN IF NOT EXISTS preparation_deadline_at timestamptz;

REVOKE INSERT(accepted_at,acceptance_deadline_at,preparation_deadline_at), UPDATE(accepted_at,acceptance_deadline_at,preparation_deadline_at) ON public.orders FROM anon,authenticated;

-- Snapshot the response policy when a paid/COD order first becomes visible.
-- Preparation is a separate operational deadline; it never triggers unanswered cancellation.
CREATE OR REPLACE FUNCTION public.stamp_store_visible_at()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE response_minutes integer; preparation_minutes integer;
BEGIN
 IF NEW.status='placed' AND (NEW.payment_method='cod' OR NEW.provider_payment_id IS NOT NULL)
    AND NOT coalesce(NEW.checkout_payment_rejected,false) THEN
  NEW.store_visible_at:=coalesce(NEW.store_visible_at,now());
  IF NEW.acceptance_deadline_at IS NULL THEN
   SELECT store_response_timeout_minutes INTO response_minutes FROM public.delivery_settings LIMIT 1;
   NEW.acceptance_deadline_at:=NEW.store_visible_at+make_interval(mins=>coalesce(response_minutes,10));
  END IF;
 END IF;
 -- Older clients can still mark packed directly. Enforce the same payment and
 -- response deadline and atomically record their acceptance before dispatch.
 IF TG_OP='UPDATE' AND OLD.status='placed' AND NEW.status='packed' AND OLD.accepted_at IS NULL THEN
  IF NEW.store_visible_at IS NULL OR coalesce(NEW.checkout_payment_rejected,false)
     OR (NEW.payment_method<>'cod' AND NEW.provider_payment_id IS NULL) THEN
   RAISE EXCEPTION USING errcode='P0409',message='PAYMENT_PENDING';
  END IF;
  IF NEW.acceptance_deadline_at<=now() THEN
   RAISE EXCEPTION USING errcode='P0409',message='ACCEPTANCE_EXPIRED';
  END IF;
  NEW.accepted_at:=now();
  SELECT avg_prep_minutes INTO preparation_minutes FROM public.stores WHERE id=NEW.store_id;
  NEW.preparation_deadline_at:=CASE WHEN preparation_minutes IS NOT NULL THEN NEW.accepted_at+make_interval(mins=>greatest(0,preparation_minutes)) END;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.stamp_store_visible_at() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stamp_store_visible_at() TO service_role;

UPDATE public.orders SET acceptance_deadline_at=store_visible_at+make_interval(mins=>coalesce((SELECT store_response_timeout_minutes FROM public.delivery_settings LIMIT 1),10))
 WHERE store_visible_at IS NOT NULL AND acceptance_deadline_at IS NULL;
-- Historical packed orders were necessarily accepted, without fabricating a new event time.
UPDATE public.orders SET accepted_at=packed_at WHERE packed_at IS NOT NULL AND accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS orders_unanswered_deadline ON public.orders(acceptance_deadline_at,id)
 WHERE status='placed' AND accepted_at IS NULL;

CREATE OR REPLACE FUNCTION public.partner_accept_order(p_order uuid,p_store uuid,p_user uuid)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; preparation_minutes integer;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order AND store_id=p_store;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='ORDER_NOT_FOUND'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.users u JOIN public.stores s ON s.id=p_store
   WHERE u.id=p_user AND u.role='store_owner' AND u.is_approved AND NOT coalesce(u.partner_suspended,false)
     AND EXISTS(SELECT 1 FROM public.users owner_account WHERE owner_account.id=s.owner_user_id AND NOT coalesce(owner_account.partner_suspended,false))
     AND NOT coalesce(s.admin_suspended,false) AND
     (s.owner_user_id=p_user OR EXISTS(SELECT 1 FROM public.store_memberships m WHERE m.store_id=s.id AND m.user_id=p_user AND m.is_active))) THEN
  RAISE EXCEPTION USING errcode='P0403',message='STORE_ACCESS_DENIED';
 END IF;
 -- Shared cancellation/acceptance coordination: advisory scope before row locks.
 PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(o.trip_id,o.id)::text,790));
 SELECT * INTO o FROM public.orders WHERE id=p_order AND store_id=p_store FOR UPDATE;
 IF o.status NOT IN('placed','packed') THEN RAISE EXCEPTION USING errcode='P0409',message='ORDER_CHANGED'; END IF;
 IF coalesce(o.checkout_payment_rejected,false) OR o.store_visible_at IS NULL
    OR (o.payment_method<>'cod' AND o.provider_payment_id IS NULL) THEN
  RAISE EXCEPTION USING errcode='P0409',message='PAYMENT_PENDING';
 END IF;
 IF o.accepted_at IS NOT NULL THEN RETURN o; END IF;
 IF o.acceptance_deadline_at IS NULL OR o.acceptance_deadline_at<=now() THEN
  RAISE EXCEPTION USING errcode='P0409',message='ACCEPTANCE_EXPIRED';
 END IF;
 SELECT avg_prep_minutes INTO preparation_minutes FROM public.stores WHERE id=p_store;
 UPDATE public.orders SET accepted_at=now(),preparation_deadline_at=CASE WHEN preparation_minutes IS NOT NULL THEN now()+make_interval(mins=>greatest(0,preparation_minutes)) END
  WHERE id=o.id RETURNING * INTO o;
 RETURN o;
END $$;
REVOKE ALL ON FUNCTION public.partner_accept_order(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.partner_accept_order(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_unanswered_store_orders(p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE mins integer; cutoff timestamptz; o orders; r jsonb; affected jsonb:='[]'; singles integer:=0; trip_count integer:=0;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Batch limit must be 1–100'; END IF;
 PERFORM set_config('lock_timeout','1000ms',true);
 SELECT store_response_timeout_minutes INTO mins FROM delivery_settings LIMIT 1;
 cutoff:=now()-make_interval(mins=>coalesce(mins,10));
 FOR o IN SELECT * FROM orders WHERE trip_id IS NULL AND status='placed' AND accepted_at IS NULL AND acceptance_deadline_at<=now()
  AND (payment_method='cod' OR provider_payment_id IS NOT NULL) AND NOT coalesce(checkout_payment_rejected,false)
  ORDER BY store_visible_at,id LIMIT p_limit FOR UPDATE SKIP LOCKED LOOP
  PERFORM 1 FROM products WHERE id IN(SELECT product_id FROM inventory_reservations
   WHERE order_id=o.id AND state IN('held','committed')) ORDER BY id FOR UPDATE;
  UPDATE orders SET status='cancelled',cancel_reason='store_no_response',cancelled_by='system' WHERE id=o.id;
  singles:=singles+1;
  affected:=affected||jsonb_build_array(jsonb_build_object('order_id',o.id,'customer_id',o.customer_id,'store_id',o.store_id,'trip_id',NULL));
 END LOOP;
 FOR o IN SELECT DISTINCT ON(trip_id) * FROM orders WHERE trip_id IS NOT NULL AND status='placed' AND accepted_at IS NULL AND acceptance_deadline_at<=now()
  AND (payment_method='cod' OR provider_payment_id IS NOT NULL) AND NOT coalesce(checkout_payment_rejected,false)
  ORDER BY trip_id,store_visible_at,id LIMIT p_limit LOOP
  -- A trip another transaction is working on is left for the next pass.
  CONTINUE WHEN NOT pg_try_advisory_xact_lock(hashtextextended(o.trip_id::text,790));
  CONTINUE WHEN NOT EXISTS(SELECT 1 FROM orders WHERE id=o.id AND status='placed' AND accepted_at IS NULL AND acceptance_deadline_at<=now());
  r:=cancel_trip_from_leg(o.id,'store_no_response','system');
  CONTINUE WHEN r->>'outcome'<>'cancelled';
  trip_count:=trip_count+1;
  affected:=affected||(SELECT coalesce(jsonb_agg(jsonb_build_object('order_id',x.id,'customer_id',x.customer_id,'store_id',x.store_id,'trip_id',x.trip_id) ORDER BY x.id),'[]')
   FROM orders x WHERE x.trip_id=o.trip_id AND x.status='cancelled');
 END LOOP;
 RETURN jsonb_build_object('cancelled_orders',jsonb_array_length(affected),'single_targets',singles,'trip_targets',trip_count,
  'timeout_minutes',coalesce(mins,10),'cancelled',affected);
END $function$
;
REVOKE ALL ON FUNCTION public.cancel_unanswered_store_orders(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_unanswered_store_orders(integer) TO service_role;


NOTIFY pgrst,'reload schema';
COMMIT;
