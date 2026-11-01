-- Rider product analytics (CLAUDE.md: "PostHog or Supabase event table").
-- One row per app event the server can't infer from orders/riders on its
-- own: app opens, screens, online sessions, offer reactions, navigation and
-- customer-call taps. Written only by POST /rider/events
-- (backend/src/routes/rider.ts), which allowlists names and strips props to
-- short ids/labels (lib/riderEvents.ts), so no PII lands here.
--
-- Backend-only, like login_otps: RLS on with no policies, no grants to
-- anon/authenticated. Rows go with the rider's account (on delete cascade).

create table if not exists public.rider_events (
  id          bigint generated always as identity primary key,
  rider_id    uuid not null references public.users(id) on delete cascade,
  name        text not null check (char_length(name) <= 40),
  props       jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  app_version text check (char_length(app_version) <= 32),
  platform    text check (platform in ('ios', 'android'))
);

-- Funnels and trends ("offers viewed vs accepted this week") read by name +
-- time; one rider's timeline reads by rider + time.
create index if not exists rider_events_name_time_idx on public.rider_events (name, occurred_at desc);
create index if not exists rider_events_rider_time_idx on public.rider_events (rider_id, occurred_at desc);

alter table public.rider_events enable row level security;
revoke all on public.rider_events from public, anon, authenticated;
grant select, insert, delete on public.rider_events to service_role;
