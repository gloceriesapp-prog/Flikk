-- Single global delivery-fee config, admin-editable (apps/admin's own
-- Settings page), replacing the hardcoded CART_DELIVERY_FEE/
-- FREE_DELIVERY_THRESHOLD constants apps/customer/src/store/useCartStore.ts
-- used to own outright. Per an explicit ask: free delivery stays OFF for
-- now (free_delivery_enabled defaults false) with a flat ₹25 fee — the
-- toggle/threshold exist so switching it on later is an admin setting
-- change, not a new app release.
--
-- Singleton table (exactly one row, never more) — a delivery-fee schedule
-- isn't per-store/per-zone yet (CLAUDE.md: single zone at launch), so one
-- global row is the correct shape today; splitting this per zone is a
-- schema change for whenever multi-zone actually exists, not a case this
-- table needs to handle preemptively.

create table delivery_settings (
  id uuid primary key default gen_random_uuid(),
  flat_delivery_fee numeric not null default 25 check (flat_delivery_fee >= 0),
  free_delivery_enabled boolean not null default false,
  free_delivery_threshold numeric not null default 199 check (free_delivery_threshold >= 0),
  updated_at timestamptz not null default now()
);

insert into delivery_settings (flat_delivery_fee, free_delivery_enabled, free_delivery_threshold)
values (25, false, 199);

alter table delivery_settings enable row level security;

-- Public read (same convention zones/categories/home_tabs already use for
-- app-wide config every customer needs, regardless of auth state) — writes
-- only ever happen via apps/admin's own service-role client
-- (supabaseAdmin), which bypasses RLS entirely, so no write policy exists
-- here on purpose.
create policy delivery_settings_read_all on delivery_settings
  for select
  using (true);
