-- Supabase performance advisor: 22 RLS policies called auth.uid() as a
-- plain function reference in USING/WITH CHECK, which Postgres re-evaluates
-- ONCE PER ROW scanned rather than once per query. Wrapping it as
-- `(select auth.uid())` lets the planner treat it as a stable
-- InitPlan — evaluated once per query instead of once per row. This is
-- exactly the fix Supabase's own docs recommend for RLS at real concurrent
-- load: the more rows a policy has to check under real traffic (many
-- customers' orders, many stores' products), the more this matters — at
-- today's row counts it's free, at production order volume it's a real
-- per-query cost multiplied by every row RLS has to test.
--
-- ALTER POLICY (not DROP + CREATE) — same policy name/command/roles,
-- purely redefining the USING/WITH CHECK expression, so there's no window
-- where the table has fewer policies than it should mid-migration.

alter policy users_read_self on public.users
  using (id = (select auth.uid()));

alter policy addresses_owner on public.addresses
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy stores_owner_write on public.stores
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

alter policy products_owner_write on public.products
  with check (store_id in (select stores.id from stores where stores.owner_user_id = (select auth.uid())));

alter policy products_owner_update on public.products
  using (store_id in (select stores.id from stores where stores.owner_user_id = (select auth.uid())));

alter policy orders_customer_read on public.orders
  using (customer_id = (select auth.uid()));

alter policy orders_store_owner_read on public.orders
  using (store_id in (select stores.id from stores where stores.owner_user_id = (select auth.uid())));

alter policy orders_rider_read on public.orders
  using (rider_id = (select auth.uid()));

alter policy orders_customer_insert on public.orders
  with check (customer_id = (select auth.uid()));

alter policy order_items_via_order on public.order_items
  using (order_id in (
    select orders.id from orders
    where orders.customer_id = (select auth.uid())
       or orders.rider_id = (select auth.uid())
       or orders.store_id in (select stores.id from stores where stores.owner_user_id = (select auth.uid()))
  ));

alter policy riders_self on public.riders
  using (user_id = (select auth.uid()));

alter policy payouts_store_owner on public.payouts
  using (store_id in (select stores.id from stores where stores.owner_user_id = (select auth.uid())));

alter policy rider_earnings_self on public.rider_earnings
  using (rider_id = (select auth.uid()));

alter policy product_variants_owner_write on public.product_variants
  with check (product_id in (
    select p.id from products p join stores s on s.id = p.store_id
    where s.owner_user_id = (select auth.uid())
  ));

alter policy product_variants_owner_update on public.product_variants
  using (product_id in (
    select p.id from products p join stores s on s.id = p.store_id
    where s.owner_user_id = (select auth.uid())
  ));

alter policy product_variants_owner_delete on public.product_variants
  using (product_id in (
    select p.id from products p join stores s on s.id = p.store_id
    where s.owner_user_id = (select auth.uid())
  ));

alter policy trips_customer_read on public.trips
  using (customer_id = (select auth.uid()));

alter policy reviews_customer_select on public.reviews
  using (customer_id = (select auth.uid()));

alter policy reviews_customer_insert on public.reviews
  with check (customer_id = (select auth.uid()));

alter policy reviews_store_owner_read on public.reviews
  using (store_id in (select stores.id from stores where stores.owner_user_id = (select auth.uid())));

alter policy wishlist_items_self on public.wishlist_items
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

alter policy referral_codes_self on public.referral_codes
  using (user_id = (select auth.uid()));
