-- Rider pay settings take effect, and the extra-shop fee becomes a setting.
-- Requires 001..107.
-- 1. delivery_settings.extra_stop_fee: what the customer pays per extra shop
--    in a multi-store order (was the literal 15 in backend/src/lib/
--    checkoutQuote.ts). Default 15 keeps the current price.
-- 2. rider_delivery_payout(fee, extra_stops): the one rider pay rule.
--    - rider_base_payout > 0: the rider earns max(rider_base_payout, the
--      delivery fee charged for that order or trip less the customer's
--      extra-shop fee) plus rider_extra_stop_payout for each extra shop, so
--      extra shops are paid once, by the extra-shop payout. A free-delivery
--      order still pays rider_base_payout.
--    - rider_base_payout = 0 (default): unchanged, the rider earns exactly the
--      delivery fee charged; the extra-shop part of that fee is reported as
--      the extra-stop share.
-- 3. rider_earnings.base_amount / extra_stop_amount store the split (it was
--    recomputed on read from the literal 15). Existing rows are backfilled
--    with that same old rule.
-- 4. record_atomic_rider_earning (latest: 107) pays through
--    rider_delivery_payout. Extra shops = shops in the trip that were not
--    cancelled, minus one. Otherwise unchanged. rider_earning_totals
--    (latest: 073, the Earnings tab day totals) reads the stored split
--    instead of recomputing it with the literal 15.
-- 5. Cash on delivery. rider_cash_collections holds one row per delivered
--    COD order or trip: the cash the rider took from the customer, until an
--    admin records that the rider handed it over (settled_at/settled_by/
--    settlement_ref). cod_cash_due(order) is the amount to collect: the
--    order total, or for a trip the trip total less its cancelled legs.
--    complete_verified_delivery (latest: 107) records the row in the same
--    transaction that marks the delivery, once per order/trip (a replay or
--    a second leg inserts nothing). Prepaid deliveries record none.
-- 6. rider_cash_outstanding() lists unsettled cash per rider and
--    settle_rider_cash(rider, admin, reference, ids) settles it; both are
--    service-role only (the admin API checks the admin session first).
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS extra_stop_fee numeric(10,2) NOT NULL DEFAULT 15
    CHECK (extra_stop_fee >= 0);

ALTER TABLE public.rider_earnings
  ADD COLUMN IF NOT EXISTS base_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS extra_stop_amount numeric(10,2);

-- Old rule: the extra-shop share was 15 per leg beyond the first.
UPDATE public.rider_earnings e
   SET extra_stop_amount = least(e.amount, 15 * greatest((SELECT count(*) FROM public.orders o WHERE o.trip_id = e.trip_id) - 1, 0))
 WHERE e.extra_stop_amount IS NULL AND e.trip_id IS NOT NULL;
UPDATE public.rider_earnings SET extra_stop_amount = 0 WHERE extra_stop_amount IS NULL;
UPDATE public.rider_earnings SET base_amount = amount - extra_stop_amount WHERE base_amount IS NULL;

CREATE OR REPLACE FUNCTION public.rider_delivery_payout(p_delivery_fee numeric, p_extra_stops integer)
 RETURNS TABLE(amount numeric, base_amount numeric, extra_stop_amount numeric)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH s AS (
    SELECT coalesce((SELECT d.rider_base_payout FROM delivery_settings d LIMIT 1), 0) AS base_payout,
           coalesce((SELECT d.rider_extra_stop_payout FROM delivery_settings d LIMIT 1), 0) AS stop_payout,
           coalesce((SELECT d.extra_stop_fee FROM delivery_settings d LIMIT 1), 15) AS stop_fee,
           greatest(coalesce(p_delivery_fee, 0), 0) AS fee,
           greatest(coalesce(p_extra_stops, 0), 0) AS stops
  ), p AS (
    SELECT round(CASE WHEN base_payout > 0 THEN greatest(base_payout, fee - least(fee, stop_fee * stops)) ELSE fee - least(fee, stop_fee * stops) END, 2) AS base_part,
           round(CASE WHEN base_payout > 0 THEN stop_payout * stops ELSE least(fee, stop_fee * stops) END, 2) AS extra_part
    FROM s
  )
  SELECT base_part + extra_part, base_part, extra_part FROM p;
$function$
;
REVOKE ALL ON FUNCTION public.rider_delivery_payout(numeric,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rider_delivery_payout(numeric,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.record_atomic_rider_earning()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE fee numeric; stops integer; pay record;
BEGIN
 IF NEW.status NOT IN('delivered','failed') OR OLD.status=NEW.status THEN RETURN NEW; END IF;
 IF NEW.rider_id IS NULL THEN RAISE EXCEPTION 'Completion requires assigned rider'; END IF;
 IF NEW.trip_id IS NULL THEN
  SELECT * INTO pay FROM rider_delivery_payout(NEW.delivery_fee,0);
  INSERT INTO rider_earnings(rider_id,order_id,amount,base_amount,extra_stop_amount)
   VALUES(NEW.rider_id,NEW.id,pay.amount,pay.base_amount,pay.extra_stop_amount) ON CONFLICT DO NOTHING;
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.trip_id::text,790));
  IF NOT EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status NOT IN('delivered','failed','cancelled')) THEN
   IF EXISTS(SELECT 1 FROM orders WHERE trip_id=NEW.trip_id AND status<>'cancelled' AND rider_id IS DISTINCT FROM NEW.rider_id) THEN
    RAISE EXCEPTION 'Trip has inconsistent rider assignments'; END IF;
   SELECT delivery_fee INTO STRICT fee FROM trips WHERE id=NEW.trip_id;
   SELECT greatest(count(DISTINCT store_id)-1,0) INTO stops FROM orders WHERE trip_id=NEW.trip_id AND status<>'cancelled';
   SELECT * INTO pay FROM rider_delivery_payout(fee,stops);
   INSERT INTO rider_earnings(rider_id,order_id,trip_id,amount,base_amount,extra_stop_amount)
    VALUES(NEW.rider_id,NEW.id,NEW.trip_id,pay.amount,pay.base_amount,pay.extra_stop_amount) ON CONFLICT DO NOTHING;
  END IF;
 END IF;
 RETURN NEW;
END $function$
;
REVOKE ALL ON FUNCTION public.record_atomic_rider_earning() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.rider_earning_totals(p_rider uuid,p_from timestamptz,p_until timestamptz)
RETURNS TABLE(day date,total numeric,base numeric,extra numeric,orders bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
 SELECT (e.earned_at AT TIME ZONE 'Asia/Kolkata')::date, sum(e.amount),
   sum(coalesce(e.base_amount,e.amount-coalesce(e.extra_stop_amount,0))),
   sum(coalesce(e.extra_stop_amount,0)),count(*)
 FROM public.rider_earnings e
 WHERE e.rider_id=p_rider AND e.earned_at>=p_from AND e.earned_at<p_until
   AND p_until>p_from AND p_until<=p_from+interval '32 days'
 GROUP BY 1 ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.rider_earning_totals(uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rider_earning_totals(uuid,timestamptz,timestamptz) TO service_role;

CREATE TABLE IF NOT EXISTS public.rider_cash_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.users(id),
  order_id uuid REFERENCES public.orders(id),
  trip_id uuid REFERENCES public.trips(id),
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  collected_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  -- The admin's auth user id (admins have no public.users row).
  settled_by uuid,
  settlement_ref text CHECK (settlement_ref IS NULL OR length(settlement_ref) BETWEEN 1 AND 200),
  CONSTRAINT rider_cash_collections_one_scope CHECK ((order_id IS NULL) <> (trip_id IS NULL)),
  CONSTRAINT rider_cash_collections_settled_by CHECK ((settled_at IS NULL) = (settled_by IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS rider_cash_collections_order_unique ON public.rider_cash_collections(order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rider_cash_collections_trip_unique ON public.rider_cash_collections(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS rider_cash_collections_outstanding ON public.rider_cash_collections(rider_id, collected_at) WHERE settled_at IS NULL;
CREATE INDEX IF NOT EXISTS rider_cash_collections_history ON public.rider_cash_collections(collected_at DESC, id DESC);
ALTER TABLE public.rider_cash_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rider_cash_collections_self ON public.rider_cash_collections;
CREATE POLICY rider_cash_collections_self ON public.rider_cash_collections FOR SELECT USING (rider_id = (SELECT auth.uid()));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.rider_cash_collections FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.cod_cash_due(p_order uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN o.payment_method IS DISTINCT FROM 'cod' THEN 0
    WHEN o.trip_id IS NULL THEN greatest(o.total, 0)
    ELSE greatest(t.total - coalesce((SELECT sum(c.total) FROM orders c WHERE c.trip_id = o.trip_id AND c.status = 'cancelled'), 0), 0)
  END
  FROM orders o LEFT JOIN trips t ON t.id = o.trip_id
  WHERE o.id = p_order;
$function$
;
REVOKE ALL ON FUNCTION public.cod_cash_due(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cod_cash_due(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_verified_delivery(p_order uuid,p_rider uuid,p_code text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o orders; c delivery_codes; scope uuid;
BEGIN
 SELECT coalesce(trip_id,id) INTO scope FROM orders WHERE id=p_order AND rider_id=p_rider;
 IF scope IS NULL THEN RETURN jsonb_build_object('accepted',false,'error','ORDER_NOT_FOUND'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(scope::text,790));
 PERFORM id FROM orders WHERE coalesce(trip_id,id)=scope ORDER BY id FOR UPDATE;
 SELECT * INTO o FROM orders WHERE id=p_order AND rider_id=p_rider;
 IF o.status='delivered' THEN RETURN jsonb_build_object('accepted',true,'replayed',true,'order',to_jsonb(o)); END IF;
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
 -- Cash on delivery: the rider now holds the customer's cash for the whole
 -- order or trip. One row per scope; the unique indexes make a replay a no-op.
 IF o.payment_method='cod' THEN
  INSERT INTO rider_cash_collections(rider_id,order_id,trip_id,amount)
  VALUES(p_rider,CASE WHEN o.trip_id IS NULL THEN o.id END,o.trip_id,cod_cash_due(o.id)) ON CONFLICT DO NOTHING;
 END IF;
 RETURN jsonb_build_object('accepted',true,'replayed',false,'order',to_jsonb(o));
END $$;
REVOKE ALL ON FUNCTION public.complete_verified_delivery(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_delivery(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.rider_cash_outstanding()
 RETURNS TABLE(rider_id uuid, outstanding_amount numeric, outstanding_count bigint, oldest_collected_at timestamptz)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT c.rider_id, sum(c.amount), count(*), min(c.collected_at)
  FROM rider_cash_collections c
  WHERE c.settled_at IS NULL
  GROUP BY c.rider_id
  ORDER BY sum(c.amount) DESC, c.rider_id;
$function$
;
REVOKE ALL ON FUNCTION public.rider_cash_outstanding() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rider_cash_outstanding() TO service_role;

-- Settles a rider's unsettled collections: every one, or only p_collections.
-- Already-settled rows are left alone, so a repeated call settles nothing.
CREATE OR REPLACE FUNCTION public.settle_rider_cash(p_rider uuid, p_admin uuid, p_reference text, p_collections uuid[] DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE ref text := nullif(btrim(p_reference),''); n bigint; total numeric;
BEGIN
 IF p_rider IS NULL OR p_admin IS NULL THEN
  RAISE EXCEPTION USING errcode='22023', message='Rider and admin are required'; END IF;
 IF length(ref)>200 THEN RAISE EXCEPTION USING errcode='22023', message='Reference is too long'; END IF;
 IF p_collections IS NOT NULL AND cardinality(p_collections)=0 THEN
  RETURN jsonb_build_object('settled_count',0,'settled_amount',0); END IF;
 WITH settled AS (
  UPDATE rider_cash_collections SET settled_at=now(),settled_by=p_admin,settlement_ref=ref
  WHERE rider_id=p_rider AND settled_at IS NULL AND (p_collections IS NULL OR id=ANY(p_collections))
  RETURNING amount)
 SELECT count(*),coalesce(sum(amount),0) INTO n,total FROM settled;
 RETURN jsonb_build_object('settled_count',n,'settled_amount',total);
END $function$
;
REVOKE ALL ON FUNCTION public.settle_rider_cash(uuid,uuid,text,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_rider_cash(uuid,uuid,text,uuid[]) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
