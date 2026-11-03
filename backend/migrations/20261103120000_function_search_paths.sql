-- Security advisor function_search_path_mutable: pin search_path on the
-- functions that still resolve names through the caller's path. Each one only
-- touches public tables and pg_catalog built-ins (pg_catalog is always searched
-- first), so `public` keeps today's name resolution exactly.
-- order_number_for was pinned in 20261102120000_db_advisor_fixes.sql.
-- Skipped where absent: service_areas_touch_updated_at was created outside
-- these migrations, so a database built from them does not have it.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.checkout_clock()',
    'public.checkout_eligibility_version()',
    'public.checkout_time_minutes(text)',
    'public.create_weekly_rider_payouts(date, date)',
    'public.home_section_accepts_products(text)',
    'public.nearby_dispatch_offers(double precision, double precision, double precision)',
    'public.nearby_online_riders(double precision, double precision, double precision)',
    'public.service_areas_touch_updated_at()'
  ] LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn);
    END IF;
  END LOOP;
END $$;
