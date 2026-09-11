-- Trips — the schema half of multi-store cart support. A customer cart can
-- now span more than one store in the zone; each store still gets its own
-- normal `orders` row (own store_id, own order_items, own packed/ready
-- status — a store owner never knows another store is involved), but every
-- order born from the same checkout shares one `trip_id`. Payment and
-- delivery fee live on the trip, ONCE, not duplicated per store-order —
-- that's what lets a rider do one multi-stop pickup ("Store 1, then Store
-- 2, then the customer") and the customer pay/see it as a single order.
--
-- A single-store cart never creates a trip — POST /orders (routes/orders.ts)
-- is untouched and stays the only path for that (still the common) case.
-- POST /trips (routes/trips.ts) is additive, only reached when the cart
-- actually spans more than one store.

create table trips (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references users(id),
  address_id uuid not null references addresses(id),
  -- The one delivery fee for the whole multi-stop trip — never duplicated
  -- onto the per-store orders below (their own delivery_fee stays 0).
  delivery_fee numeric not null,
  -- Sum of every leg's own item_total — kept denormalized here (same
  -- reasoning as orders.item_total: never re-derive a paid total from
  -- current product prices) so GET /trips/:id doesn't need to re-sum its
  -- child orders on every read.
  item_total numeric not null,
  total numeric not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  -- Trip-level status is deliberately coarse (placed vs. terminal) — the
  -- real per-leg progress (packed/out_for_delivery/delivered) lives on each
  -- child order's own `status`, same state machine as any other order;
  -- 'delivered' here only ever gets set once every leg is independently
  -- delivered, 'cancelled' only once every leg is independently cancelled.
  -- A trip where one leg is delivered and another is cancelled (the store
  -- couldn't fulfill it) stays 'placed' — TrackOrderScreen reads the child
  -- orders' own statuses for that case, not this coarse field.
  status text not null default 'placed' check (status in ('placed', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table orders add column trip_id uuid references trips(id);
create index orders_trip_id_idx on orders(trip_id);

-- RLS: same shape as orders_customer_read (001_init.sql) — a trip is
-- visible to the customer who placed it. Store owners/riders never query
-- trips directly (they only ever see their own already-scoped orders rows,
-- which carry everything a store/rider needs); they just happen to share a
-- trip_id with sibling orders they can't read. Admin bypasses RLS entirely
-- via the service-role key (001_init.sql's own note), so no admin policy
-- is needed here either.
alter table trips enable row level security;
create policy trips_customer_read on trips for select using (customer_id = auth.uid());
