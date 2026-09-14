-- Real account-backed wishlist — apps/customer's useWishlistStore was
-- local-device-only (zustand persist + AsyncStorage, no backend). This is
-- the server side that lets it sync across devices/reinstalls the same
-- way orders/addresses already do for that account.

create table wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references users(id),
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

alter table wishlist_items enable row level security;
create policy wishlist_items_self on wishlist_items for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
