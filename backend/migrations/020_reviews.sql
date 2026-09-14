-- Real "rate your order" submission — previously decorative-only (apps/
-- customer's OrderRow star row rendered with no backend behind it). One
-- review per delivered order (not per store) — a customer who orders from
-- the same store twice can rate each experience separately, matching what
-- "rate your ORDER" actually promises rather than a single running
-- per-store review a second order would just overwrite.

create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) unique,
  customer_id uuid not null references users(id),
  store_id uuid not null references stores(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- stores.rating (001_init.sql) is recomputed from this table on every
-- insert (POST /reviews, application code — see routes/reviews.ts's own
-- note) rather than via a DB trigger: keeps the aggregate-update logic in
-- the same testable TypeScript layer as every other money/rating
-- computation in this codebase, not split across SQL and application code.

alter table reviews enable row level security;
-- A customer can read/write only their own review; a store owner can read
-- (not write) every review left for their own store — same ownership
-- pattern as orders_store_owner_read (001_init.sql).
create policy reviews_customer_select on reviews for select using (customer_id = auth.uid());
create policy reviews_customer_insert on reviews for insert with check (customer_id = auth.uid());
create policy reviews_store_owner_read on reviews for select using (
  store_id in (select id from stores where owner_user_id = auth.uid())
);
