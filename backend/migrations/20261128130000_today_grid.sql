-- "Today on Gloceries" Home grid (backend/src/today-grid, packages/today-grid,
-- admin /today-grid). WRITTEN, NOT APPLIED: apply only after review.
--   * today_grid_versions + today_grid_state: versioned JSONB config. Every
--     admin save is a new draft version (who, when, diff); Publish points the
--     live grid at one version. Restore = a new draft copied from an old one.
--   * store_fresh_arrivals / village_picks: daily hero inputs, expiring at IST
--     midnight (expires_at is computed in IST by the API, not server UTC).
--   * brands.is_local / local_sort: Namma Brands shows local brands only.
--   * products.party_enabled: Party Orders card.
--   * today_grid_events: impressions/taps for the admin Performance tab.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE IF NOT EXISTS public.today_grid_versions(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 config jsonb NOT NULL CHECK(jsonb_typeof(config)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by text NOT NULL CHECK(length(created_by) BETWEEN 3 AND 320),
 diff jsonb NOT NULL DEFAULT '[]'::jsonb,
 note text CHECK(note IS NULL OR length(note) <= 200),
 restored_from bigint REFERENCES public.today_grid_versions(id),
 published_at timestamptz,
 published_by text
);

CREATE TABLE IF NOT EXISTS public.today_grid_state(
 id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
 enabled boolean NOT NULL DEFAULT true,
 published_version_id bigint REFERENCES public.today_grid_versions(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text
);
INSERT INTO public.today_grid_state(id) VALUES(1) ON CONFLICT DO NOTHING;

-- Publish atomically: mark the version, point the live grid at it.
CREATE OR REPLACE FUNCTION public.publish_today_grid(p_version bigint, p_admin_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
DECLARE v today_grid_versions;
BEGIN
 IF coalesce(length(btrim(p_admin_email)),0) NOT BETWEEN 3 AND 320 THEN RAISE EXCEPTION USING errcode='P0422',message='Admin email required'; END IF;
 SELECT * INTO v FROM today_grid_versions WHERE id=p_version FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Version not found'; END IF;
 UPDATE today_grid_versions SET published_at=now(),published_by=lower(btrim(p_admin_email)) WHERE id=p_version;
 UPDATE today_grid_state SET published_version_id=p_version,updated_at=now(),updated_by=lower(btrim(p_admin_email)) WHERE id=1;
 RETURN jsonb_build_object('published_version_id',p_version);
END $function$;

CREATE TABLE IF NOT EXISTS public.store_fresh_arrivals(
 store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
 arrival_date date NOT NULL, -- IST date
 fish_arrived_at timestamptz NOT NULL,
 fish_product_ids uuid[] NOT NULL DEFAULT '{}',
 expires_at timestamptz NOT NULL, -- next IST midnight
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text,
 PRIMARY KEY(store_id, arrival_date)
);

CREATE TABLE IF NOT EXISTS public.village_picks(
 product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
 picked_at timestamptz NOT NULL,
 farm_name text CHECK(farm_name IS NULL OR length(farm_name) <= 60),
 expires_at timestamptz NOT NULL, -- next IST midnight after picked_at
 updated_by text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS village_picks_live ON public.village_picks(expires_at);

ALTER TABLE public.brands
 ADD COLUMN IF NOT EXISTS is_local boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS local_sort integer;
CREATE INDEX IF NOT EXISTS brands_local ON public.brands(local_sort, name) WHERE is_local;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS party_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.today_grid_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 at timestamptz NOT NULL DEFAULT now(),
 type text NOT NULL CHECK(type IN('impression','tap','add_to_cart')),
 card_id text NOT NULL CHECK(length(card_id) <= 40),
 slot text CHECK(slot IS NULL OR length(slot) <= 20),
 position smallint,
 hero text CHECK(hero IS NULL OR length(hero) <= 40),
 customer_id uuid -- null for guests; only to attribute orders after a tap
);
CREATE INDEX IF NOT EXISTS today_grid_events_at ON public.today_grid_events(at, card_id);
CREATE INDEX IF NOT EXISTS today_grid_events_taps ON public.today_grid_events(customer_id, at) WHERE type='tap' AND customer_id IS NOT NULL;

-- Service role only (backend + admin API).
ALTER TABLE public.today_grid_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.today_grid_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_fresh_arrivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.today_grid_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.today_grid_versions, public.today_grid_state, public.store_fresh_arrivals, public.village_picks, public.today_grid_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.today_grid_versions, public.today_grid_state, public.store_fresh_arrivals, public.village_picks, public.today_grid_events TO service_role;
REVOKE ALL ON FUNCTION public.publish_today_grid(bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_today_grid(bigint,text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
