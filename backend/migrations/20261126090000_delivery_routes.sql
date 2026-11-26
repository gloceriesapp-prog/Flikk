-- Shared delivery routes (2026-11-26): one saved road route per order and
-- leg, the single source of truth both the customer and rider apps draw.
--   pickup: rider -> store (worked out once a rider is on the way)
--   drop:   rider/store -> customer (worked out after pickup)
-- The server works each leg out once (one Google call) and re-routes only
-- when the rider has left that road on two fixes in a row: at most 3 times
-- per leg, a minute apart (backend/src/tracking/legRoutes.ts). `version`
-- tells both apps when to redraw. Server-only: no client access.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE IF NOT EXISTS public.delivery_routes (
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  leg text NOT NULL CHECK (leg IN ('pickup', 'drop')),
  points jsonb NOT NULL CHECK (jsonb_typeof(points) = 'array' AND jsonb_array_length(points) >= 2),
  distance_m integer CHECK (distance_m >= 0),
  duration_s integer CHECK (duration_s >= 0),
  origin_lat double precision NOT NULL,
  origin_lng double precision NOT NULL,
  dest_lat double precision NOT NULL,
  dest_lng double precision NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  reroutes integer NOT NULL DEFAULT 0 CHECK (reroutes >= 0),
  off_streak integer NOT NULL DEFAULT 0 CHECK (off_streak >= 0),
  last_fix_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, leg)
);
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_routes FROM anon, authenticated;
GRANT ALL ON public.delivery_routes TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
