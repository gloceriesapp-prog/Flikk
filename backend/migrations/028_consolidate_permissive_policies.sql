-- Supabase performance advisor: orders/reviews/stores each had 2-3
-- separate permissive SELECT policies covering non-overlapping conditions
-- (customer OR rider OR store owner, etc.) — Postgres evaluates every
-- permissive policy on a table for every row scanned, so 3 separate
-- policies is 3x the check work of one OR'd policy for the exact same
-- access rules. Consolidating preserves the identical effective
-- permissions, just as one policy per action instead of several.

-- orders: 3 SELECT policies -> 1
drop policy orders_customer_read on public.orders;
drop policy orders_rider_read on public.orders;
drop policy orders_store_owner_read on public.orders;

create policy orders_read on public.orders
  for select
  using (
    customer_id = (select auth.uid())
    or rider_id = (select auth.uid())
    or store_id in (select stores.id from stores where stores.owner_user_id = (select auth.uid()))
  );

-- reviews: 2 SELECT policies -> 1
drop policy reviews_customer_select on public.reviews;
drop policy reviews_store_owner_read on public.reviews;

create policy reviews_read on public.reviews
  for select
  using (
    customer_id = (select auth.uid())
    or store_id in (select stores.id from stores where stores.owner_user_id = (select auth.uid()))
  );

-- stores: stores_owner_write (ALL) overlapped stores_read_active (SELECT)
-- on the SELECT action. Split the ALL policy into per-write-action
-- policies (owners never needed a SEPARATE select policy — folding the
-- owner condition into stores_read_active covers it, including an
-- owner's own currently-inactive store, which stores_read_active alone
-- wouldn't have shown).
drop policy stores_owner_write on public.stores;

create policy stores_owner_insert on public.stores
  for insert
  with check (owner_user_id = (select auth.uid()));

create policy stores_owner_update on public.stores
  for update
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy stores_owner_delete on public.stores
  for delete
  using (owner_user_id = (select auth.uid()));

alter policy stores_read_active on public.stores
  using (is_active = true or owner_user_id = (select auth.uid()));
