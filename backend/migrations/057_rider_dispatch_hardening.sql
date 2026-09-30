-- Rider-dispatch hardening — two production/scale fixes surfaced by review
-- of the packed → rider-notify path (migration 036's own functions). Both
-- are safe to run against a live DB: the function is CREATE OR REPLACE with
-- an unchanged signature, and the index is CREATE INDEX IF NOT EXISTS.
--
-- FIX A — presence staleness. 036's nearby_online_riders filtered on
-- status='online' alone. But status only ever flips to 'offline' via an
-- explicit PATCH /rider/status (routes/rider.ts) — a JS-only call that a
-- killed/suspended app can never send. So a rider who went online and then
-- had the app hard-killed stayed status='online' in the DB *forever* and
-- kept drawing dispatch pushes at a frozen, stale position. last_location_
-- update was already written every ping (routes/rider.ts) but never read as
-- a cutoff anywhere. This adds that cutoff: a rider is only "nearby" if they
-- pinged within the freshness window. LOCATION_PING_INTERVAL_MS is 45s, so
-- 3 minutes tolerates ~4 missed pings before a rider goes dark — well short
-- of "online forever".
-- ponytail: filter-only fix, no server-side sweep to flip stale rows back to
-- 'offline'. The filter already makes stale riders undispatchable (the real
-- harm — phantom pushes). Add a sweep cron only if the stale 'online' rows
-- themselves start mattering (e.g. an admin "riders online now" count reads
-- wrong); the dispatch path itself no longer cares.

create or replace function nearby_online_riders(p_store_lat double precision, p_store_lng double precision, p_radius_m double precision)
returns table(rider_user_id uuid, distance_m double precision)
language sql
stable
as $$
  with distances as (
    select
      r.user_id,
      6371000 * acos(least(1, greatest(-1,
        cos(radians(p_store_lat)) * cos(radians(r.current_lat)) * cos(radians(r.current_lng) - radians(p_store_lng))
        + sin(radians(p_store_lat)) * sin(radians(r.current_lat))
      ))) as distance_m
    from riders r
    where r.status = 'online'
      and r.current_lat is not null
      and r.current_lng is not null
      and r.last_location_update is not null
      and r.last_location_update > now() - interval '3 minutes'
  )
  select user_id as rider_user_id, distance_m
  from distances
  where distance_m <= p_radius_m
  order by distance_m asc;
$$;

-- FIX B — open-dispatch lookup was a full-table scan. Both the per-rider
-- poll (GET /rider/dispatch-offers → nearby_dispatch_offers) and the 1-min
-- cron (expandDispatchOrRebroadcast) filter orders on exactly
-- (status='packed' AND rider_id IS NULL). With no matching index that is an
-- O(total_orders) scan of an ever-growing table on every poll of every
-- online rider. This partial index is tiny (only open, unassigned packed
-- orders — usually a handful) and serves both callers, including the cron's
-- extra dispatch_broadcast_at < cutoff range check.
create index if not exists orders_open_dispatch_idx
  on orders (dispatch_broadcast_at)
  where status = 'packed' and rider_id is null;
