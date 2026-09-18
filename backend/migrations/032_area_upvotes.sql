-- Real persistence for "bring the app to my area" upvotes
-- (UpvoteAreaBar.tsx/UnavailableZoneSection.tsx) — that UI used to be
-- local-only (tap flips a useState, nothing sent anywhere), per its own
-- header comment. Public insert (no login required — a customer outside
-- the delivery zone may not even be signed in yet), no public read/
-- update/delete: only the backend's own service-role client ever reads
-- these rows back (e.g. for a future admin "most-requested areas" view).
create table area_upvotes (
  id uuid primary key default gen_random_uuid(),
  latitude numeric not null,
  longitude numeric not null,
  address_label text not null,
  created_at timestamptz not null default now()
);

alter table area_upvotes enable row level security;
-- Intentionally no policies — every real write/read on this table goes
-- through the backend's own service-role client (bypasses RLS entirely),
-- same "RLS enabled, no policy, verified safe" pattern already accepted
-- elsewhere in this schema for backend-only tables.
