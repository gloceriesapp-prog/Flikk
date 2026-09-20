-- Real onboarding-wizard rebuild — new fields the redesigned Store
-- Details / Owner Details / Business Documents / Store Hours steps
-- collect that had no column to land in yet.

-- Owner's own optional email (Owner Details step) — real users.email,
-- distinct from Supabase Auth's own internal auth.users.email (this app
-- never uses email/password auth, phone OTP only; this is just a contact
-- field on our own public.users row).
alter table users add column if not exists email text;

-- Udyam/business registration number (Business Documents step) — optional,
-- same "add later if you don't have one" treatment as GST. Real column on
-- both the draft and the approved store, same pattern every other
-- document field here already follows.
alter table store_onboarding_drafts add column if not exists udyam_number text;
alter table stores add column if not exists udyam_number text;

-- Store's own contact phone (Store Details step) — stores.phone already
-- exists (unused until now); the draft table never had it.
alter table store_onboarding_drafts add column if not exists phone text;

-- Store hours (new Store Hours step) — stores.open_time/close_time already
-- exist; the draft table never had them, so nothing set during onboarding
-- ever reached the approved store until now (StoreSettingsScreen was the
-- only place these were ever actually set, post-approval).
alter table store_onboarding_drafts add column if not exists open_time text;
alter table store_onboarding_drafts add column if not exists close_time text;
