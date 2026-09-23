-- Per-store delivery reach. Nullable: a store with no value falls back to the
-- global DEFAULT_RADIUS_KM (12km, startup reach) in GET /stores/nearest and
-- GET /serviceability. Lets a founder widen/narrow one store's coverage from
-- admin's StoreDetailForm without a code change, without forcing a number on
-- every existing row. Geography stays per-store lat/lng + haversine distance
-- (no PostGIS) — this is just the cutoff that distance is compared against.
-- RLS already covers stores (001_init.sql); no new policy needed.
alter table stores add column if not exists delivery_radius_km double precision;

comment on column stores.delivery_radius_km is
  'Max delivery distance (km) from this store. NULL = use global default (12).';
