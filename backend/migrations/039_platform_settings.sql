-- Commission rate moves from a hardcoded backend constant
-- (lib/pricing.ts's own COMMISSION_RATE, was 0.06) to an admin-editable
-- setting — per an explicit ask, changing the platform's cut shouldn't
-- need a code deploy.
--
-- A separate singleton table from delivery_settings (029/030), not a new
-- column on it: delivery_settings has a public read RLS policy (every app
-- needs the delivery fee/threshold at checkout, regardless of auth state)
-- — commission rate is the platform's own take-rate, never something a
-- customer/partner/rider app should be able to read via the anon key, so
-- it needs its own admin-only table instead of inheriting that public
-- policy.
create table platform_settings (
  id uuid primary key default gen_random_uuid(),
  commission_rate numeric not null default 0.06 check (commission_rate >= 0 and commission_rate <= 1),
  updated_at timestamptz not null default now()
);

insert into platform_settings (commission_rate) values (0.06);

alter table platform_settings enable row level security;

-- No policies at all — same "admin-owned, no public policy" convention as
-- promo_codes/promo_redemptions (019). Only apps/admin's own service-role
-- client (writes) and the backend's own service-role client (checkout-time
-- reads via getCommissionRate, lib/pricing.ts) ever touch this table.
