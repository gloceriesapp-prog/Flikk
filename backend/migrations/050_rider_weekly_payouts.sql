-- Rider weekly payout release — the rider-side mirror of the store weekly
-- payout (payouts table + migration 012_weekly_payout_release.sql).
--
-- Riders earn a flat per-delivery fee (single order) or one combined trip
-- fee (multi-store trip) — written to rider_earnings on every 'delivered'
-- transition in routes/orders.ts. Nothing settled those earnings before
-- this: rider_earnings.paid_at was declared in 001_init but never written.
-- This adds the same two-phase compute -> release the store side runs, and
-- the DB-level guards that make it safe to re-run.

-- One row per rider per settlement week, same shape/status set as payouts
-- after migration 012 (pending -> processing -> paid, or blocked/failed).
create table rider_payouts (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references users(id),
  week_start date not null,
  week_end date not null,
  -- Riders have no platform commission deducted (they're paid the delivery
  -- fee outright), so a single settled amount — no gross/commission/net
  -- split the way stores need. Kept as one column deliberately, not three
  -- identical ones.
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'blocked', 'failed')),
  razorpay_payout_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- The real idempotency guard — one settlement row per rider per week, same
-- role payouts_store_week_unique plays for stores. A retried compute pass
-- conflicts here (23505) and moves on instead of double-inserting.
create unique index rider_payouts_rider_week_unique on rider_payouts (rider_id, week_start);

alter table rider_payouts enable row level security;
-- A rider reads only their own payout rows — rider_id is the users.id, which
-- is auth.uid() for a rider session (same self-scoping rider_earnings_self
-- already uses).
create policy rider_payouts_self on rider_payouts for select using (rider_id = auth.uid());

-- Which payout settled a given earning. NULL = still owed — exactly the set
-- the compute phase sweeps. Set the moment an earning is rolled into a
-- payout row; paid_at (below, already on the table) is stamped when the
-- money actually moves.
alter table rider_earnings add column rider_payout_id uuid references rider_payouts(id);
-- Fast lookup of the still-owed set (the compute phase's only query filter).
create index rider_earnings_unpaid on rider_earnings (rider_id) where rider_payout_id is null;

-- Trip double-pay guard. routes/orders.ts paid a trip's rider via an
-- app-level check-then-insert ("does any sibling leg already have an
-- earnings row?") with a real TOCTOU window between the check and the
-- insert — two legs racing into "all delivered" at once could both pass the
-- check and both insert. Moving the guarantee into the DB closes it: a
-- multi-store trip pays exactly one earnings row (keyed on trip_id), a plain
-- order exactly one (keyed on order_id). The insert just catches 23505.
alter table rider_earnings add column trip_id uuid references trips(id);
create unique index rider_earnings_trip_unique on rider_earnings (trip_id) where trip_id is not null;
create unique index rider_earnings_order_unique on rider_earnings (order_id) where trip_id is null;
