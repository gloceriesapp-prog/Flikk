-- Rider pay per delivery becomes a fixed amount, so the platform keeps the rest
-- of the delivery fee.
--
-- Before (108): with delivery_settings.rider_base_payout > 0 the rider earned
-- the HIGHER of that amount and the delivery fee charged, so a ₹30 fee with a
-- ₹25 payout still paid the rider ₹30.
-- Now: with rider_base_payout > 0 the rider earns exactly that amount per
-- order or trip; the rest of the delivery fee stays with the platform. Extra
-- shops on a trip pay rider_extra_stop_payout each when set, else the
-- customer's extra-shop fee (extra_stop_fee) for each, as before.
-- rider_base_payout = 0 (the default) is unchanged: the rider earns exactly
-- the delivery fee charged.
-- Earnings already recorded keep their amounts. record_atomic_rider_earning
-- (108) already pays through this function.
BEGIN;
SET LOCAL lock_timeout='5s';

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
    SELECT round(CASE WHEN base_payout > 0 THEN base_payout ELSE fee - least(fee, stop_fee * stops) END, 2) AS base_part,
           round(CASE WHEN base_payout > 0 AND stop_payout > 0 THEN stop_payout * stops ELSE least(fee, stop_fee * stops) END, 2) AS extra_part
    FROM s
  )
  SELECT base_part + extra_part, base_part, extra_part FROM p;
$function$;

REVOKE ALL ON FUNCTION public.rider_delivery_payout(numeric,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rider_delivery_payout(numeric,integer) TO service_role;

COMMIT;
