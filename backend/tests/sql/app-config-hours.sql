\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
-- The clock check runs before any row lookup, so random ids are enough: an
-- open window falls through to the address check, a closed one stops first.
CREATE OR REPLACE FUNCTION pg_temp.assert_message(at_utc timestamptz) RETURNS text LANGUAGE plpgsql AS $$
DECLARE msg text;
BEGIN
  EXECUTE format('CREATE OR REPLACE FUNCTION public.checkout_clock() RETURNS timestamptz LANGUAGE sql VOLATILE AS $c$ SELECT %L::timestamptz $c$', at_utc);
  BEGIN
    PERFORM checkout_assert_store(gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
    RETURN 'passed';
  EXCEPTION WHEN sqlstate 'P1001' THEN GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT; RETURN msg;
  END;
END $$;

DO $$
DECLARE r record; open_msg constant text := 'Choose a saved address with a valid map pin';
BEGIN
  IF has_function_privilege('anon','checkout_assert_store(uuid,uuid,uuid)','EXECUTE')
   OR has_function_privilege('authenticated','checkout_assert_store(uuid,uuid,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'checkout_assert_store exposed to API roles'; END IF;

  -- Defaults equal the old literal window: 6:00 AM to 10:30 PM IST.
  SELECT ordering_opens_minute o, ordering_closes_minute c INTO r FROM delivery_settings LIMIT 1;
  IF r.o <> 360 OR r.c <> 1350 THEN RAISE EXCEPTION 'Default ordering hours changed: % %', r.o, r.c; END IF;
  -- 00:29:59Z = 05:59 IST closed; 00:30Z = 06:00 open; 16:59Z = 22:29 open; 17:00Z = 22:30 closed.
  IF pg_temp.assert_message('2026-10-04 00:29:59+00') <> 'Ordering is closed until 6:00 AM IST' THEN
    RAISE EXCEPTION 'Before default opening: %', pg_temp.assert_message('2026-10-04 00:29:59+00'); END IF;
  IF pg_temp.assert_message('2026-10-04 00:30:00+00') <> open_msg THEN RAISE EXCEPTION 'Default opening minute refused'; END IF;
  IF pg_temp.assert_message('2026-10-04 16:59:59+00') <> open_msg THEN RAISE EXCEPTION 'Last default minute refused'; END IF;
  IF pg_temp.assert_message('2026-10-04 17:00:00+00') <> 'Ordering is closed until 6:00 AM IST' THEN
    RAISE EXCEPTION 'Default closing minute accepted'; END IF;

  -- Configured window 7:15 AM to 9:00 PM IST.
  UPDATE delivery_settings SET ordering_opens_minute = 435, ordering_closes_minute = 1260;
  IF pg_temp.assert_message('2026-10-04 01:00:00+00') <> 'Ordering is closed until 7:15 AM IST' THEN
    RAISE EXCEPTION '06:30 IST should be closed with the configured time: %', pg_temp.assert_message('2026-10-04 01:00:00+00'); END IF;
  IF pg_temp.assert_message('2026-10-04 01:45:00+00') <> open_msg THEN RAISE EXCEPTION '07:15 IST refused'; END IF;
  IF pg_temp.assert_message('2026-10-04 15:29:00+00') <> open_msg THEN RAISE EXCEPTION '20:59 IST refused'; END IF;
  IF pg_temp.assert_message('2026-10-04 15:30:00+00') <> 'Ordering is closed until 7:15 AM IST' THEN RAISE EXCEPTION '21:00 IST accepted'; END IF;
  -- Afternoon opening formats as PM; full-day window is accepted.
  UPDATE delivery_settings SET ordering_opens_minute = 750, ordering_closes_minute = 1440;
  IF pg_temp.assert_message('2026-10-04 06:00:00+00') <> 'Ordering is closed until 12:30 PM IST' THEN
    RAISE EXCEPTION 'PM label: %', pg_temp.assert_message('2026-10-04 06:00:00+00'); END IF;
  IF pg_temp.assert_message('2026-10-04 18:29:00+00') <> open_msg THEN RAISE EXCEPTION '23:59 IST refused with closes=1440'; END IF;

  -- The window must be ordered and inside the day.
  BEGIN UPDATE delivery_settings SET ordering_opens_minute = 600, ordering_closes_minute = 600;
    RAISE EXCEPTION 'Empty window accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE delivery_settings SET ordering_opens_minute = 0, ordering_closes_minute = 1441;
    RAISE EXCEPTION 'Window past midnight accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE delivery_settings SET ordering_opens_minute = -1;
    RAISE EXCEPTION 'Negative opening accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
-- Festival Section and Seasonal Section are orderable Home sections.
DO $$ BEGIN
  IF (SELECT count(*) FROM home_sections WHERE key IN ('festival-picks','seasonal') AND enabled) <> 2 THEN
    RAISE EXCEPTION 'festival-picks / seasonal home sections missing'; END IF;
  -- The festival tab is off until an admin turns it on; the seeded row keeps
  -- the Navratri artwork, and malformed colours are refused.
  IF EXISTS (SELECT 1 FROM festival_greeting WHERE tab_enabled OR tab_title <> 'Navratri'
             OR tab_banner_image_url IS DISTINCT FROM 'Images/navbg.png') THEN
    RAISE EXCEPTION 'festival tab defaults wrong'; END IF;
  BEGIN UPDATE festival_greeting SET tab_background_color = 'red';
    RAISE EXCEPTION 'Malformed tab colour accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE festival_greeting SET tab_title = '  ';
    RAISE EXCEPTION 'Blank tab title accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
-- Promotions kill switch defaults off; campaign summaries count per status
-- and are service-role only.
DO $$
DECLARE r record; c uuid := gen_random_uuid(); u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM platform_settings WHERE promotions_enabled) THEN RAISE EXCEPTION 'Promotions on by default'; END IF;
  IF has_function_privilege('anon','promotional_campaigns(integer)','EXECUTE') OR has_function_privilege('authenticated','promotional_campaigns(integer)','EXECUTE')
   OR NOT has_function_privilege('service_role','promotional_campaigns(integer)','EXECUTE') THEN
    RAISE EXCEPTION 'promotional_campaigns privileges wrong'; END IF;
  INSERT INTO users(id,phone,role,is_approved) VALUES (u1,'+919999981001','customer',true),(u2,'+919999981002','customer',true);
  INSERT INTO promotional_deliveries(campaign_id,customer_id,channel,subject,body,status) VALUES
    (c,u1,'sms','Diwali','10% off','accepted'),(c,u2,'sms','Diwali','10% off','skipped');
  SELECT * INTO r FROM promotional_campaigns(50) WHERE campaign_id = c;
  IF r.recipients <> 2 OR r.accepted <> 1 OR r.skipped <> 1 OR r.queued <> 0 OR r.subject <> 'Diwali' OR r.channel <> 'sms' THEN
    RAISE EXCEPTION 'Campaign summary wrong: %', r; END IF;
END $$;
ROLLBACK;
\echo 'app-config-hours: ok'
