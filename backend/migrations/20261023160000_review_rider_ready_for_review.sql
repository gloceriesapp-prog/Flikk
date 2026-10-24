-- The store-review rider (Google Play and App Store) must land on the app's
-- Home screen, not on setup. /auth/me reports rider_payout_configured only
-- when riders.payout_method is set, and without it the rider app opens the
-- "One last thing" bank/UPI form, which a reviewer cannot complete (it needs
-- a real Indian account). It also showed "Service zone not assigned" and the
-- name "Play Review Rider" on Home.
--
-- ensure_play_review_rider now also gives the account a placeholder UPI
-- payout (never paid: the account is fenced off from offers, so it never
-- earns), the first active zone, and a store-neutral name, then is re-run
-- for the production reviewer number.
CREATE OR REPLACE FUNCTION public.ensure_play_review_rider(p_phone text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE uid uuid; review_zone uuid;
BEGIN
 IF p_phone !~ '^\+91[6-9][0-9]{9}$' THEN RAISE EXCEPTION 'Phone must be +91 followed by a 10-digit mobile number'; END IF;
 SELECT id INTO uid FROM users WHERE phone=p_phone;
 IF uid IS NULL THEN
  INSERT INTO users (phone, name, role, is_approved, account_type)
  VALUES (p_phone, 'App Review Rider', 'rider', true, 'rider') RETURNING id INTO uid;
 ELSE
  IF EXISTS (SELECT 1 FROM riders WHERE user_id=uid AND NOT is_review_account) THEN
   RAISE EXCEPTION 'This number belongs to a real rider; use another number';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE id=uid AND role IN ('admin','store_owner')) THEN
   RAISE EXCEPTION 'This number belongs to an admin or partner; use another number';
  END IF;
  UPDATE users SET role='rider', is_approved=true, is_rejected=false, account_type='rider',
   name='App Review Rider' WHERE id=uid;
 END IF;
 SELECT id INTO review_zone FROM zones WHERE is_active ORDER BY created_at NULLS LAST, id LIMIT 1;
 INSERT INTO riders (user_id, name, phone, vehicle_type, vehicle_number, is_review_account,
                     zone_id, payout_method, payout_upi_id)
 VALUES (uid, 'App Review Rider', p_phone, 'scooter', 'KA00RV0000', true,
         review_zone, 'upi', 'appreview@gloceries')
 ON CONFLICT (user_id) DO UPDATE SET is_review_account=true, is_active=true,
  suspended_reason=null, suspended_at=null, suspended_by=null,
  name='App Review Rider',
  zone_id=coalesce(riders.zone_id, EXCLUDED.zone_id),
  payout_method=coalesce(riders.payout_method, EXCLUDED.payout_method),
  payout_upi_id=coalesce(riders.payout_upi_id, EXCLUDED.payout_upi_id);
 RETURN uid;
END $function$;
REVOKE ALL ON FUNCTION public.ensure_play_review_rider(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_play_review_rider(text) TO service_role;

SELECT public.ensure_play_review_rider('+919000000102');
