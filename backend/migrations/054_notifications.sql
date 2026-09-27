-- In-app notifications feed — the persistent complement to the fire-and-forget
-- Expo pushes (lib/pushNotifications.ts). A push is a one-shot OS banner that's
-- gone if the app was closed or the token stale; this table is the durable
-- record the rider app's own notifications screen reads back (GET
-- /rider/notifications), so "you were assigned a pickup 20 min ago" survives a
-- missed/expired push exactly the way GET /assignments already survives a
-- missed dispatch push. Written best-effort alongside the real action it rides
-- (lib/notifications.ts's createNotification never throws), never as a gate on
-- that action.
--
-- type: 'assignment' (a pickup/delivery was assigned) | 'approval' |
-- 'rejection' (onboarding decision) | 'general'. order_id is nullable — a
-- multi-store trip assignment or an onboarding decision has no single order —
-- and ON DELETE SET NULL so a purged order leaves its notifications readable
-- rather than cascading them away.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'general' check (type in ('assignment', 'approval', 'rejection', 'general')),
  order_id uuid references orders(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- The one read pattern: a user's own feed, newest first (GET /rider/notifications).
create index if not exists notifications_user_created_idx on notifications(user_id, created_at desc);

-- Same self-scoping shape as every other user-owned table (see
-- rider_payouts_self in 050, and 027/028's `(select auth.uid())` optimized
-- form the planner treats as a stable init-plan value). A user reads and marks
-- read only their own rows. No insert policy for anon/authenticated on purpose:
-- rows are written only by the backend's service-role client (db/supabase.ts),
-- which bypasses RLS — same as orders/riders inserts. So an app session can
-- never forge a notification for itself or anyone else.
alter table notifications enable row level security;

create policy notifications_self_select on notifications
  for select
  using (user_id = (select auth.uid()));

create policy notifications_self_update on notifications
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
