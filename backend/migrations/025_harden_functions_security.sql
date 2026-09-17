-- Production-readiness security hardening flagged by Supabase's own advisor
-- (mcp get_advisors, security lints) before launch:
--
-- 1. rls_auto_enable() is a DDL event-trigger function (fires automatically
--    on CREATE TABLE to force-enable RLS on every new table — see whichever
--    earlier migration created the event trigger itself), never meant to be
--    called directly. Postgres auto-grants EXECUTE to PUBLIC on new
--    functions, and Supabase's PostgREST layer exposes every public-schema
--    function as an RPC endpoint by default — so it was reachable at
--    /rest/v1/rpc/rls_auto_enable by any anon/authenticated caller even
--    though invoking it directly would just error (event-trigger functions
--    can only be invoked by their own trigger mechanism). Revoking EXECUTE
--    closes that surface cleanly; the event trigger itself still fires it
--    with no EXECUTE grant needed (triggers don't go through the normal
--    privilege check RPC calls do).
--
-- 2. create_order/create_trip_orders/sync_products_is_in_stock all had a
--    mutable search_path (none set at all) — a real hardening gap on the
--    two functions that actually place real orders/trips and touch
--    promo_redemptions/promo_codes. Pinning search_path stops a
--    search_path-hijack from resolving `orders`/`promo_codes`/etc. against
--    an attacker-controlled schema earlier in a caller's search_path.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.create_order(
  p_customer_id uuid,
  p_store_id uuid,
  p_address_id uuid,
  p_item_total numeric,
  p_delivery_fee numeric,
  p_commission_amount numeric,
  p_total numeric,
  p_items jsonb,
  p_promo_code_id uuid,
  p_discount_amount numeric
) set search_path = public;

alter function public.create_trip_orders(
  p_customer_id uuid,
  p_address_id uuid,
  p_delivery_fee numeric,
  p_item_total numeric,
  p_total numeric,
  p_legs jsonb,
  p_promo_code_id uuid,
  p_discount_amount numeric
) set search_path = public;

alter function public.sync_products_is_in_stock() set search_path = public;
