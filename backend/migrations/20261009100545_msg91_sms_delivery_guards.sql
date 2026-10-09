BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Delivery metadata only. Supabase Auth owns OTP generation, storage and verification.
-- HMAC identifiers prevent phone numbers or low-entropy OTPs leaking through this ledger.
CREATE TABLE public.auth_sms_deliveries (
  event_key text PRIMARY KEY CHECK (event_key ~ '^[a-f0-9]{64}$'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed', 'unknown', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_sms_deliveries_expiry ON public.auth_sms_deliveries(created_at);
CREATE TABLE public.auth_sms_budgets (
  bucket text NOT NULL,
  window_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits > 0),
  PRIMARY KEY (bucket, window_at)
);
CREATE INDEX auth_sms_budgets_expiry ON public.auth_sms_budgets(expires_at);
ALTER TABLE public.auth_sms_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sms_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_sms_deliveries, public.auth_sms_budgets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_sms_deliveries, public.auth_sms_budgets TO service_role;

CREATE FUNCTION public.claim_send_sms_delivery(
  p_event_key text, p_payload_hash text, p_phone_key text,
  p_global_limit integer DEFAULT 100, p_daily_limit integer DEFAULT 10000
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  receipt public.auth_sms_deliveries%ROWTYPE;
  inserted integer;
  v_now timestamptz := clock_timestamp();
  minute_window timestamptz;
  hour_window timestamptz;
  day_window timestamptz;
  budget record;
  used integer;
  denied boolean := false;
BEGIN
  IF p_event_key IS NULL OR p_event_key !~ '^[a-f0-9]{64}$'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$'
    OR p_phone_key IS NULL OR p_phone_key !~ '^[a-f0-9]{64}$'
    OR p_global_limit IS NULL OR p_global_limit NOT BETWEEN 1 AND 500
    OR p_daily_limit IS NULL OR p_daily_limit NOT BETWEEN 1 AND 1000000 THEN
    RAISE EXCEPTION 'Invalid SMS delivery claim';
  END IF;
  INSERT INTO public.auth_sms_deliveries(event_key, payload_hash)
  VALUES(p_event_key, p_payload_hash) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  -- The unique insert coordinates concurrent hook deliveries across backend replicas.
  SELECT * INTO STRICT receipt FROM public.auth_sms_deliveries WHERE event_key = p_event_key FOR UPDATE;
  IF inserted = 0 THEN
    RETURN CASE WHEN receipt.payload_hash = p_payload_hash AND receipt.status = 'sent' THEN 'sent' ELSE 'blocked' END;
  END IF;
  minute_window := date_trunc('minute', v_now, 'UTC');
  hour_window := date_trunc('hour', v_now, 'UTC');
  day_window := date_trunc('day', v_now, 'UTC');
  -- All send paths, including direct Supabase Auth requests, share these limits.
  -- Fixed lock ordering prevents deadlocks. Never retry an ambiguous provider send.
  BEGIN
  FOR budget IN SELECT * FROM (VALUES
    ('global:day', day_window, day_window + interval '2 days', p_daily_limit),
    ('global:minute', minute_window, minute_window + interval '2 hours', p_global_limit),
    ('phone:hour:' || p_phone_key, hour_window, hour_window + interval '2 hours', 5),
    ('phone:minute:' || p_phone_key, minute_window, minute_window + interval '2 hours', 1)
  ) AS limits(bucket, window_at, expires_at, max_hits) ORDER BY bucket LOOP
    INSERT INTO public.auth_sms_budgets AS windows(bucket, window_at, expires_at, hits)
    VALUES(budget.bucket, budget.window_at, budget.expires_at, 1)
    ON CONFLICT(bucket, window_at) DO UPDATE SET hits = windows.hits + 1
    RETURNING hits INTO used;
    denied := denied OR used > budget.max_hits;
  END LOOP;
  IF denied THEN RAISE EXCEPTION USING ERRCODE = 'P0429', MESSAGE = 'SMS quota reached'; END IF;
  EXCEPTION WHEN SQLSTATE 'P0429' THEN
    -- Roll back tentative budget increments: blocked sends do not consume paid-send allowance.
    denied := true;
  END;
  IF denied THEN
    UPDATE public.auth_sms_deliveries SET status = 'blocked', updated_at = now() WHERE event_key = p_event_key;
    RETURN 'blocked';
  END IF;
  RETURN 'claimed';
END;
$$;

CREATE FUNCTION public.finish_send_sms_delivery(p_event_key text, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_event_key IS NULL OR p_event_key !~ '^[a-f0-9]{64}$'
    OR p_status IS NULL OR p_status NOT IN ('sent', 'failed', 'unknown') THEN
    RAISE EXCEPTION 'Invalid SMS delivery outcome';
  END IF;
  UPDATE public.auth_sms_deliveries SET status = p_status, updated_at = now()
  WHERE event_key = p_event_key AND status = 'sending';
  IF NOT FOUND AND NOT EXISTS (
    SELECT 1 FROM public.auth_sms_deliveries WHERE event_key = p_event_key AND status = p_status
  ) THEN RAISE EXCEPTION 'SMS delivery outcome conflict'; END IF;
END;
$$;

CREATE FUNCTION public.prune_send_sms_deliveries() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE removed integer; budgets_removed integer;
BEGIN
  WITH due AS (
    SELECT event_key FROM public.auth_sms_deliveries WHERE created_at < now() - interval '1 day'
    ORDER BY created_at LIMIT 10000 FOR UPDATE SKIP LOCKED
  ) DELETE FROM public.auth_sms_deliveries d USING due WHERE d.event_key = due.event_key;
  GET DIAGNOSTICS removed = ROW_COUNT;
  WITH due AS (
    SELECT bucket, window_at FROM public.auth_sms_budgets WHERE expires_at < now()
    ORDER BY expires_at LIMIT 10000 FOR UPDATE SKIP LOCKED
  ) DELETE FROM public.auth_sms_budgets b USING due WHERE b.bucket = due.bucket AND b.window_at = due.window_at;
  GET DIAGNOSTICS budgets_removed = ROW_COUNT;
  RETURN removed + budgets_removed;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_send_sms_delivery(text,text,text,integer,integer),
  public.finish_send_sms_delivery(text,text), public.prune_send_sms_deliveries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_send_sms_delivery(text,text,text,integer,integer),
  public.finish_send_sms_delivery(text,text), public.prune_send_sms_deliveries() TO service_role;
COMMIT;
