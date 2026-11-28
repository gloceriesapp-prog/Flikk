-- "Today on Gloceries" Home grid (backend/src/today-grid). WRITTEN, NOT
-- APPLIED: apply only after review. Smallest schema for the grid's data checks:
--   * today_grid_config: one JSONB row (cards, slot table, backups, festival
--     dates, rain switch) instead of many tables; parsed defensively in code.
--   * store_fresh_arrivals: today's fish arrival time per shop (admin/partner input).
--   * products.picked_at: when a village item was picked (Village Fresh hero).
--   * products.party_enabled: party-order products (Party Orders card).
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE IF NOT EXISTS public.today_grid_config(
 id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
 enabled boolean NOT NULL DEFAULT true,
 config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(config)='object'),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text
);
INSERT INTO public.today_grid_config(id) VALUES(1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.store_fresh_arrivals(
 store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
 arrival_date date NOT NULL,
 fish_arrived_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text,
 PRIMARY KEY(store_id, arrival_date)
);

ALTER TABLE public.products
 ADD COLUMN IF NOT EXISTS picked_at timestamptz,
 ADD COLUMN IF NOT EXISTS party_enabled boolean NOT NULL DEFAULT false;

-- Service role only (backend + admin API); customers read through the API.
ALTER TABLE public.today_grid_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_fresh_arrivals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.today_grid_config, public.store_fresh_arrivals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.today_grid_config, public.store_fresh_arrivals TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
