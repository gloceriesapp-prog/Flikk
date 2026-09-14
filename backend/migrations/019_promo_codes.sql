-- Cart-level coupon/promo codes. Distinct from any existing per-item
-- discount (products has none today, but a future one would live on
-- products/order_items, not here) — this is one code applied against the
-- whole cart's item_total at checkout, same as any real e-commerce promo.
--
-- discount_amount/promo_code_id live on orders AND trips (not just orders)
-- since a promo can be applied to either checkout path — see
-- backend/src/lib/promos.ts's own note on why validation/redemption logic
-- is shared between both.

create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('flat', 'percent')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  -- percent discounts need a ceiling (a 50%-off code on a ₹5000 cart
  -- shouldn't wipe out the delivery fee's worth of margin many times
  -- over) — null means uncapped, only sensible for a flat-type code.
  max_discount_amount numeric(10,2),
  min_order_value numeric(10,2) not null default 0,
  -- null = unlimited overall redemptions. Per-customer limit is always
  -- exactly 1 (promo_redemptions' own unique constraint below) — no promo
  -- code in this schema is stackable/repeatable by the same customer.
  usage_limit int,
  times_used int not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- One redemption row per (code, customer) — the actual enforcement of
-- "each customer can use a given code once", not just an audit log.
-- order_id/trip_id are mutually exclusive (exactly one set, matching
-- which checkout path was used) but neither is NOT NULL: the redemption
-- is written in the same atomic RPC that creates the order/trip
-- (lib/promos.ts's own note), so both must stay nullable at the column
-- level even though application logic never leaves both null.
create table promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references promo_codes(id),
  customer_id uuid not null references users(id),
  order_id uuid references orders(id),
  trip_id uuid references trips(id),
  discount_amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique (promo_code_id, customer_id)
);

alter table orders add column discount_amount numeric(10,2) not null default 0;
alter table orders add column promo_code_id uuid references promo_codes(id);

alter table trips add column discount_amount numeric(10,2) not null default 0;
alter table trips add column promo_code_id uuid references promo_codes(id);

-- RLS: promo_codes/promo_redemptions are never read directly by any app —
-- POST /orders, POST /trips, and POST /promos/validate (all backend,
-- service-role) are the only callers, same as every other admin-owned
-- pricing input (stores.rating, orders.commission_amount). No public
-- policy needed, but RLS is still enabled per every other table's own
-- convention (001_init.sql's own header note) so a future anon-key read
-- fails closed by default instead of silently being wide open.
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;
