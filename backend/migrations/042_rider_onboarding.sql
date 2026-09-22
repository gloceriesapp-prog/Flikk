-- Real rider onboarding — previously there was no self-serve application
-- flow at all (auth.ts's own GET /me note admitted this: "a phone number
-- only ever becomes role='rider' via a manual DB change"). Same real
-- pattern store onboarding already uses: an applicant's data lives in a
-- draft table until a founder approves it — role only flips to 'rider'
-- (and a real `riders` row is only ever created) at that moment, never
-- before. A rejected/pending applicant stays role='customer' the whole
-- time, same as a rejected store owner does today.

create table rider_onboarding_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) unique,
  full_name text,
  date_of_birth date,
  home_address text,
  aadhaar_number text,
  aadhaar_photo_url text,
  dl_number text,
  dl_photo_url text,
  vehicle_type text check (vehicle_type in ('bicycle', 'scooter', 'motorcycle')),
  vehicle_number text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  rejection_reason text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rider_onboarding_drafts enable row level security;

-- Same self-only RLS shape as store_onboarding_drafts (020_reviews.sql's
-- sibling migration, store_onboarding_drafts' own original policy) — a
-- rider applicant reads/writes only their own draft; admin's own
-- service-role client bypasses this entirely for the approve/reject flow.
create policy rider_onboarding_drafts_self on rider_onboarding_drafts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- The real, approved rider's own profile gains the same fields, once
-- approved (app/api/approvals/riders/[userId]'s own approve action copies
-- the draft across) — plus real payout columns, same shape stores already
-- have (verifyPayoutAccount.ts is method-agnostic, reused as-is for riders).
alter table riders add column date_of_birth date;
alter table riders add column home_address text;
alter table riders add column aadhaar_number text;
alter table riders add column aadhaar_photo_url text;
alter table riders add column dl_number text;
alter table riders add column dl_photo_url text;
alter table riders add column vehicle_type text check (vehicle_type in ('bicycle', 'scooter', 'motorcycle'));
alter table riders add column emergency_contact_name text;
alter table riders add column emergency_contact_phone text;
alter table riders add column emergency_contact_relationship text;
alter table riders add column payout_method text check (payout_method in ('bank_account'));
alter table riders add column payout_bank_account_number text;
alter table riders add column payout_bank_ifsc text;
alter table riders add column payout_bank_name text;
alter table riders add column payout_account_holder_name text;
alter table riders add column razorpay_contact_id text;
alter table riders add column razorpay_fund_account_id text;

-- Aadhaar/DL photos are real, sensitive PII — unlike every other storage
-- bucket in this project (all public: store/product/category images),
-- this one stays PRIVATE. aadhaar_photo_url/dl_photo_url columns above
-- store the raw object PATH, not a public URL; admin's own approvals API
-- generates a short-lived signed URL on read (service-role only), so a
-- rider's ID photo is never reachable by guessing/enumerating a public URL.
insert into storage.buckets (id, name, public)
values ('rider-documents', 'rider-documents', false)
on conflict (id) do nothing;
