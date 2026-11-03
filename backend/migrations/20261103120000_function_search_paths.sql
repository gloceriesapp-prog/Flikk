-- Security advisor function_search_path_mutable: pin search_path on the
-- functions that still resolve names through the caller's path. Each one only
-- touches public tables and pg_catalog built-ins (pg_catalog is always searched
-- first), so `public` keeps today's name resolution exactly.
-- order_number_for was pinned in 20261102120000_db_advisor_fixes.sql.
ALTER FUNCTION public.checkout_clock() SET search_path = public;
ALTER FUNCTION public.checkout_eligibility_version() SET search_path = public;
ALTER FUNCTION public.checkout_time_minutes(text) SET search_path = public;
ALTER FUNCTION public.create_weekly_rider_payouts(date, date) SET search_path = public;
ALTER FUNCTION public.home_section_accepts_products(text) SET search_path = public;
ALTER FUNCTION public.nearby_dispatch_offers(double precision, double precision, double precision) SET search_path = public;
ALTER FUNCTION public.nearby_online_riders(double precision, double precision, double precision) SET search_path = public;
ALTER FUNCTION public.service_areas_touch_updated_at() SET search_path = public;
