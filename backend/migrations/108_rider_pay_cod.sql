-- Rider pay settings take effect, and the extra-shop fee becomes a setting.
-- Requires 001..107.
-- 1. delivery_settings.extra_stop_fee: what the customer pays per extra shop
--    in a multi-store order (was the literal 15 in backend/src/lib/
--    checkoutQuote.ts). Default 15 keeps the current price.
-- 2. rider_delivery_payout(fee, extra_stops): the one rider pay rule.
--    - rider_base_payout > 0: the rider earns max(rider_base_payout, the
--      delivery fee charged for that order or trip) plus
--      rider_extra_stop_payout for each extra shop. A free-delivery order
--      still pays rider_base_payout.
--    - rider_base_payout = 0 (default): unchanged, the rider earns exactly the
--      delivery fee charged; the extra-shop part of that fee is reported as
--      the extra-stop share.
-- 3. rider_earnings.base_amount / extra_stop_amount store the split (it was
--    recomputed on read from the literal 15). Existing rows are backfilled
--    with that same old rule.
-- 4. record_atomic_rider_earning (latest: 107) pays through
--    rider_delivery_payout. Extra shops = shops in the trip that were not
--    cancelled, minus one. Otherwise unchanged.
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
    SELECT round(CASE WHEN base_payout > 0 THEN greatest(base_payout, fee) ELSE fee - least(fee, stop_fee * stops) END, 2) AS base_part,
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

NOTIFY pgrst,'reload schema';
COMMIT;
