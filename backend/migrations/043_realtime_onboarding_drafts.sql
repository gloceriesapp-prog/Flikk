-- Admin dashboard live-sync gap fix. app/api/realtime/route.ts subscribes to
-- postgres_changes on store_onboarding_drafts, rider_onboarding_drafts,
-- users and reviews so the Approvals page + Sidebar pending badge refresh
-- the instant an application is submitted/approved/rejected — but Supabase
-- Realtime only streams changes for tables in the supabase_realtime
-- publication, and 017_enable_realtime.sql only ever added orders/stores/
-- riders. So those four subscriptions silently never fired (a brand-new
-- store OR rider application only writes to its own draft table, no real
-- stores/riders row exists until approval). Publish them here.
--
-- Idempotent: a table already in the publication is skipped, so this is
-- safe to re-run and safe if any table was added out of band.

do $$
declare
  t text;
begin
  foreach t in array array['store_onboarding_drafts', 'rider_onboarding_drafts', 'users', 'reviews']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
