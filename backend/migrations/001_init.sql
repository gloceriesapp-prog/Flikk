-- Gloceries v1 schema. Source: specs/00-foundation/data-model.md
-- Every table gets RLS enabled here, alongside creation — not a follow-up migration.

create extension if not exists "pgcrypto";

create table zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  role text not null check (role in ('customer', 'store_owner', 'rider', 'admin')),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);
-- customer role is never gated on is_approved in application logic; column exists on every
-- row for schema simplicity, but only store_owner/rider access checks read it.

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text,
  line1 text not null,
  landmark text,
  zone_id uuid not null references zones(id),
  is_default boolean not null default false
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id),
  zone_id uuid not null references zones(id),
  name text not null,
  category text not null,
  rating numeric(2,1),
  avg_prep_minutes int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  unit text not null,
  price numeric(10,2) not null check (price >= 0),
  category text not null,
  is_in_stock boolean not null default true,
  image_url text
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references users(id),
  store_id uuid not null references stores(id),
  rider_id uuid references users(id),
  address_id uuid not null references addresses(id),
  status text not null default 'placed'
    check (status in ('placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled')),
  item_total numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  commission_amount numeric(10,2) not null,
  total numeric(10,2) not null,
  razorpay_payment_id text,
  placed_at timestamptz not null default now(),
  packed_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz
);

-- order_items.unit_price_at_order is deliberately denormalized — never join against
-- products.price for order totals. See specs/00-foundation/data-model.md.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  unit_price_at_order numeric(10,2) not null
);

create table riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) unique,
  name text not null,
  phone text not null,
  vehicle_number text,
  is_active boolean not null default true
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  week_start date not null,
  week_end date not null,
  gross_amount numeric(10,2) not null,
  commission_deducted numeric(10,2) not null,
  net_payout numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid'))
);

create table rider_earnings (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references users(id),
  order_id uuid not null references orders(id),
  amount numeric(10,2) not null,
  paid_at timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS. Enabled per table, alongside creation. See data-model.md's policy table.
-- ---------------------------------------------------------------------------

alter table zones enable row level security;
create policy zones_read_all on zones for select using (true);

alter table users enable row level security;
create policy users_read_self on users for select using (id = auth.uid());

alter table addresses enable row level security;
create policy addresses_owner on addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table stores enable row level security;
create policy stores_read_active on stores for select using (is_active = true);
create policy stores_owner_write on stores for all
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

alter table products enable row level security;
create policy products_read_all on products for select using (true);
create policy products_owner_write on products for insert
  with check (store_id in (select id from stores where owner_user_id = auth.uid()));
create policy products_owner_update on products for update
  using (store_id in (select id from stores where owner_user_id = auth.uid()));

alter table orders enable row level security;
create policy orders_customer_read on orders for select using (customer_id = auth.uid());
create policy orders_store_owner_read on orders for select
  using (store_id in (select id from stores where owner_user_id = auth.uid()));
create policy orders_rider_read on orders for select using (rider_id = auth.uid());
create policy orders_customer_insert on orders for insert with check (customer_id = auth.uid());

alter table order_items enable row level security;
create policy order_items_via_order on order_items for select
  using (order_id in (
    select id from orders
    where customer_id = auth.uid()
       or rider_id = auth.uid()
       or store_id in (select id from stores where owner_user_id = auth.uid())
  ));

alter table riders enable row level security;
create policy riders_self on riders for select using (user_id = auth.uid());

alter table payouts enable row level security;
create policy payouts_store_owner on payouts for select
  using (store_id in (select id from stores where owner_user_id = auth.uid()));

alter table rider_earnings enable row level security;
create policy rider_earnings_self on rider_earnings for select using (rider_id = auth.uid());

-- admin role bypasses RLS entirely via the Supabase service-role key, used only by
-- backend /admin/* routes — never shipped to any client. See auth-and-roles.md.
