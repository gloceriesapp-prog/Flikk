-- App configuration: ordering hours. Requires 001..107.
-- 1. delivery_settings gains ordering_opens_minute / ordering_closes_minute:
--    the platform-wide ordering window in IST minutes since midnight
--    (0..1440, opens < closes). Defaults 360 / 1350 are the old literal
--    6:00 AM to 10:30 PM window used by SQL, the backend and the customer app.
-- 2. checkout_assert_store (latest: 104) reads the window from
--    delivery_settings instead of the literals, and the refusal message names
--    the configured opening time. The rest of the body is unchanged.
-- 3. home_sections gains 'festival-picks' and 'seasonal' rows.
-- 4. Festival/seasonal/home-section tables join the realtime publication.
-- 5. festival_greeting gains the festival tab switch, title, colours, artwork.
-- 6. platform_settings.promotions_enabled: DB kill switch for promotions.
-- 7. promotional_campaigns(limit): campaign summaries for admin.
-- 8. app_release_config: per-app versions, store links, force update, maintenance.
-- 9. app_faqs: customer FAQ entries.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS ordering_opens_minute integer NOT NULL DEFAULT 360
    CHECK (ordering_opens_minute >= 0 AND ordering_opens_minute <= 1440),
  ADD COLUMN IF NOT EXISTS ordering_closes_minute integer NOT NULL DEFAULT 1350
    CHECK (ordering_closes_minute >= 0 AND ordering_closes_minute <= 1440);
ALTER TABLE public.delivery_settings DROP CONSTRAINT IF EXISTS delivery_settings_ordering_window_check;
ALTER TABLE public.delivery_settings ADD CONSTRAINT delivery_settings_ordering_window_check
  CHECK (ordering_opens_minute < ordering_closes_minute);

-- 104's guard, with the settings-driven ordering window.
create or replace function public.checkout_assert_store(customer uuid, address_id uuid, store_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.addresses; s public.stores; minute integer; opens integer; closes integer; radius double precision; km double precision; current_time_at timestamptz;
  window_opens integer; window_closes integer;
begin
  current_time_at := checkout_clock();
  minute := extract(hour from current_time_at at time zone 'Asia/Kolkata')::integer * 60
    + extract(minute from current_time_at at time zone 'Asia/Kolkata')::integer;
  select ds.ordering_opens_minute, ds.ordering_closes_minute into window_opens, window_closes from public.delivery_settings ds limit 1;
  window_opens := coalesce(window_opens, 360); window_closes := coalesce(window_closes, 1350);
  if minute < window_opens or minute >= window_closes then
    raise exception using errcode='P1001', message='Ordering is closed until '
      || to_char(time '00:00' + make_interval(mins => window_opens % 1440), 'FMHH12:MI AM') || ' IST'; end if;
  select * into a from public.addresses where id=address_id and user_id=customer and deleted_at is null for share;
  if not found or a.latitude is null or a.longitude is null or not(a.latitude between -90 and 90 and a.longitude between -180 and 180) then
    raise exception using errcode='P1001', message='Choose a saved address with a valid map pin'; end if;
  select * into s from public.stores where id=store_id for share;
  if not found or not s.is_active then raise exception using errcode='P1001', message='Shop closed'; end if;
  perform 1 from public.zones where id=a.zone_id and id=s.zone_id and is_active for share;
  if not found then raise exception using errcode='P1001', message='Shop cannot deliver to this area'; end if;
  if nullif(trim(s.open_time),'') is not null or nullif(trim(s.close_time),'') is not null then
    opens := checkout_time_minutes(s.open_time); closes := checkout_time_minutes(s.close_time);
    if opens is null or closes is null or (opens < closes and not(minute >= opens and minute < closes))
      or (opens > closes and not(minute >= opens or minute < closes)) then
      raise exception using errcode='P1001', message='Shop closed'; end if;
  end if;
  radius := coalesce(s.delivery_radius_km, default_delivery_radius_km());
  if s.lat is null or s.lng is null or not(s.lat between -90 and 90 and s.lng between -180 and 180) or radius <= 0 or radius::text in ('NaN','Infinity','-Infinity') then
    raise exception using errcode='P1001', message='Delivery from this shop is unavailable'; end if;
  km := delivery_road_km(a.latitude, a.longitude, s.lat, s.lng);
  if km > radius then raise exception using errcode='P1001', message='Shop cannot deliver to this address'; end if;
end $$;
REVOKE ALL ON FUNCTION public.checkout_assert_store(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_assert_store(uuid,uuid,uuid) TO service_role;

-- 3. The admin Festival Section (018) and Seasonal Section (040) become Home
--    "All" sections the admin Home Sections screen can order and switch off.
--    Disabled-by-content: each renders nothing while inactive or empty.
INSERT INTO public.home_sections (key, title, sort_index) VALUES
  ('festival-picks', null, 15),
  ('seasonal', null, 25)
ON CONFLICT (key) DO NOTHING;

-- 5. The customer Home festival tab becomes admin-controlled (it was a
--    hard-coded, always-on Navratri tab). festival_greeting (056) gains the
--    tab switch (default OFF), its title, colours and artwork. Artwork is a
--    storage path (served through the public media URL) or an https URL;
--    the existing row keeps the Navratri artwork so switching it on restores
--    the old tab exactly.
ALTER TABLE public.festival_greeting
  ADD COLUMN IF NOT EXISTS tab_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tab_title text NOT NULL DEFAULT 'Navratri'
    CHECK (char_length(btrim(tab_title)) BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS tab_background_color text NOT NULL DEFAULT '#FFF1D6'
    CHECK (tab_background_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS tab_header_color text NOT NULL DEFAULT '#F6C667'
    CHECK (tab_header_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS tab_header_image_url text
    CHECK (tab_header_image_url IS NULL OR char_length(tab_header_image_url) <= 1000),
  ADD COLUMN IF NOT EXISTS tab_banner_image_url text
    CHECK (tab_banner_image_url IS NULL OR char_length(tab_banner_image_url) <= 1000);
UPDATE public.festival_greeting
SET tab_header_image_url = coalesce(tab_header_image_url, 'Images/Transparent%20Navratri%20Puja%20Arrangement.png'),
    tab_banner_image_url = coalesce(tab_banner_image_url, 'Images/navbg.png')
WHERE tab_header_image_url IS NULL OR tab_banner_image_url IS NULL;

-- 4. Festival, seasonal and Home layout edits reach open customer apps live:
--    the backend's home realtime channel listens to these tables.
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['festival_greeting','festival_sections','festival_section_products','seasonal_banner','seasonal_tiles','home_sections'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

-- 6. Promotions kill switch (default OFF). The promotional worker sends only
--    when this AND the backend's PROMOTIONS_ENABLED env var are on; both
--    queuing routes refuse while it is off. Toggled on admin's Promotions page.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS promotions_enabled boolean NOT NULL DEFAULT false;

-- 7. Past campaigns for the admin Promotions page: one row per campaign and
--    channel with per-status recipient counts. Never returns destinations.
CREATE OR REPLACE FUNCTION public.promotional_campaigns(p_limit integer DEFAULT 50)
RETURNS TABLE(campaign_id uuid, channel text, subject text, body text, created_at timestamptz, updated_at timestamptz,
  recipients bigint, queued bigint, sending bigint, accepted bigint, skipped bigint, failed bigint, uncertain bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.campaign_id, d.channel, min(d.subject), min(d.body), min(d.created_at), max(d.updated_at), count(*),
    count(*) FILTER (WHERE d.status = 'queued'), count(*) FILTER (WHERE d.status = 'sending'),
    count(*) FILTER (WHERE d.status = 'accepted'), count(*) FILTER (WHERE d.status = 'skipped'),
    count(*) FILTER (WHERE d.status = 'failed'), count(*) FILTER (WHERE d.status = 'uncertain')
  FROM public.promotional_deliveries d
  GROUP BY d.campaign_id, d.channel
  ORDER BY min(d.created_at) DESC, d.campaign_id
  LIMIT greatest(1, least(coalesce(p_limit, 50), 200))
$$;
REVOKE ALL ON FUNCTION public.promotional_campaigns(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.promotional_campaigns(integer) TO service_role;

-- 8. App release config, one row per app: minimum supported and latest
--    versions (dotted numbers), store links, force update (blocks anything
--    below latest) and maintenance mode. Edited on admin "App settings",
--    served by the backend's public GET /app-config(/release/:app). Defaults
--    block nothing and keep maintenance off.
CREATE TABLE IF NOT EXISTS public.app_release_config (
  app text PRIMARY KEY CHECK (app IN ('customer','partner','rider')),
  min_supported_version text NOT NULL DEFAULT '0.0.0' CHECK (min_supported_version ~ '^\d{1,4}(\.\d{1,4}){0,3}$'),
  latest_version text NOT NULL DEFAULT '0.0.0' CHECK (latest_version ~ '^\d{1,4}(\.\d{1,4}){0,3}$'),
  ios_store_url text CHECK (ios_store_url IS NULL OR (ios_store_url ~ '^https://' AND char_length(ios_store_url) <= 500)),
  android_store_url text CHECK (android_store_url IS NULL OR (android_store_url ~ '^https://' AND char_length(android_store_url) <= 500)),
  force_update boolean NOT NULL DEFAULT false,
  maintenance_enabled boolean NOT NULL DEFAULT false,
  maintenance_message text CHECK (maintenance_message IS NULL OR char_length(maintenance_message) <= 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.app_release_config (app) VALUES ('customer'),('partner'),('rider') ON CONFLICT (app) DO NOTHING;
ALTER TABLE public.app_release_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_release_config FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.app_release_config TO service_role;

-- 9. Customer FAQ entries (Help & support), edited on admin "App settings".
CREATE TABLE IF NOT EXISTS public.app_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL CHECK (char_length(btrim(question)) BETWEEN 1 AND 300),
  answer text NOT NULL CHECK (char_length(btrim(answer)) BETWEEN 1 AND 4000),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_faqs_active_order ON public.app_faqs (sort_order, created_at) WHERE is_active;
ALTER TABLE public.app_faqs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_faqs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.app_faqs TO service_role;

COMMIT;
