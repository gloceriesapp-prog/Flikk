-- Rider weekly working-hours / availability — the rider's own recurring
-- "these are the hours I work" schedule, stored right on the existing `riders`
-- row (no new table: it's exactly one small config object per rider, read only
-- by that rider's own GET /rider/availability and by admin ops). This is
-- presence *intent* — deliberately NOT a dispatch gate: lib/riderDispatch.ts
-- and migration 036's nearby_online_riders keep keying off riders.status alone,
-- so nothing about who receives a pickup changes here (a rider outside their
-- configured hours who is still 'online' is still dispatchable exactly as
-- before). auto_online is a client-side convenience flag the rider app reads to
-- decide whether to auto-toggle status='online' when inside a window.
--
-- `availability` JSONB shape — a fixed 7-element array, one DaySchedule per
-- weekday, ascending, validated in lib/riderSchedule.ts before it's ever
-- written:
--   [{ "day": 0, "enabled": true,  "start": "09:00", "end": "18:00" }, ... "day": 6]
--   day     : 0=Sunday .. 6=Saturday (JS Date.getDay() convention).
--   enabled : whether the rider works that weekday at all.
--   start/end: 'HH:MM' 24-hour IST WALL-CLOCK (not UTC). IST is a fixed +5:30
--             no-DST offset; the same wall-clock-stored / UTC-DB reasoning
--             lib/payoutSchedule.ts documents applies — a window is compared
--             against IST-formatted "now", never against a raw UTC instant.
--             Meaningful only when enabled; end must be > start (no overnight
--             windows in v1).
-- Default '[]' means "never configured" — combined with auto_online defaulting
-- FALSE, an un-migrated / un-touched rider behaves EXACTLY as before this
-- feature: no window is ever consulted and nothing auto-toggles.
--
-- No new RLS policy: these are columns on the existing `riders` table, and both
-- the rider endpoints and admin read them through the service-role client
-- (db/supabase.ts) which bypasses RLS — same as every other riders read here.

alter table riders
  add column if not exists availability jsonb not null default '[]'::jsonb,
  add column if not exists auto_online boolean not null default false;
