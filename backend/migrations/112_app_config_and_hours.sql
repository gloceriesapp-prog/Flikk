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

COMMIT;
