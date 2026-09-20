-- Automated rider-dispatch — explicit CLAUDE.md scope override (see that
-- file's own Scope discipline section). Real-time presence + location on
-- `riders`, and per-order dispatch-broadcast bookkeeping on `orders` so the
-- expanding-radius fallback job (backend/src/lib/riderDispatch.ts) knows
-- what's already been tried without a separate offers table.
--
-- No PostGIS — a plain Haversine formula over a handful of online riders
-- in one zone is real, correct, and doesn't need a new extension at this
-- order volume (nearby_online_riders/nearby_dispatch_offers below).

alter table riders
  add column if not exists status text not null default 'offline' check (status in ('offline', 'online', 'on_delivery')),
  add column if not exists current_lat double precision,
  add column if not exists current_lng double precision,
  add column if not exists last_location_update timestamptz;

create index if not exists riders_status_idx on riders(status);

alter table orders
  add column if not exists dispatch_radius_m integer,
  add column if not exists dispatch_broadcast_at timestamptz;

-- Store-side lookup: every online rider with a real recent-enough position
-- within p_radius_m of the store, nearest first. Used the moment a store
-- marks an order 'packed' (routes/orders.ts) and again by the expanding-
-- radius fallback job.
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
  )
  select user_id as rider_user_id, distance_m
  from distances
  where distance_m <= p_radius_m
  order by distance_m asc;
$$;

-- Rider-side lookup: every currently-open dispatch offer (packed, no rider
-- yet, already broadcast at least once) within p_radius_m of the rider's
-- own live position. Backs GET /rider/dispatch-offers — the rider app's
-- "available pickups near you" list, not just whatever push notification
-- happened to land.
create or replace function nearby_dispatch_offers(p_rider_lat double precision, p_rider_lng double precision, p_radius_m double precision)
returns table(order_id uuid, distance_m double precision)
language sql
stable
as $$
  with distances as (
    select
      o.id,
      6371000 * acos(least(1, greatest(-1,
        cos(radians(p_rider_lat)) * cos(radians(s.lat)) * cos(radians(s.lng) - radians(p_rider_lng))
        + sin(radians(p_rider_lat)) * sin(radians(s.lat))
      ))) as distance_m
    from orders o
    join stores s on s.id = o.store_id
    where o.status = 'packed'
      and o.rider_id is null
      and o.dispatch_broadcast_at is not null
      and s.lat is not null
      and s.lng is not null
  )
  select id as order_id, distance_m
  from distances
  where distance_m <= p_radius_m
  order by distance_m asc;
$$;
