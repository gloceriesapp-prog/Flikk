BEGIN;
CREATE TABLE IF NOT EXISTS public.promotional_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid NOT NULL,
 customer_id uuid NOT NULL REFERENCES public.users(id),
 channel text NOT NULL CHECK(channel IN ('sms','email')),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 120),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','accepted','skipped','failed','uncertain')),
 provider_id text,
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 lease_token uuid,
 lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(campaign_id,customer_id,channel)
);
ALTER TABLE public.promotional_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.promotional_deliveries FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.promotional_deliveries TO service_role;
CREATE INDEX IF NOT EXISTS promotional_delivery_queue ON public.promotional_deliveries(available_at,id) WHERE status IN ('queued','sending');
CREATE INDEX IF NOT EXISTS promotional_delivery_leases ON public.promotional_deliveries(lease_until,id) WHERE status='sending';
CREATE INDEX IF NOT EXISTS promotional_delivery_expiry ON public.promotional_deliveries(expires_at,id) WHERE status='queued';
CREATE OR REPLACE FUNCTION public.claim_promotional_deliveries(p_limit integer DEFAULT 20)
RETURNS SETOF public.promotional_deliveries LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 -- Never blindly retry an SMS whose provider response was lost. Email retries
 -- retain the same provider idempotency key within the 24-hour window.
 WITH expired AS (
  SELECT id FROM promotional_deliveries WHERE status='sending' AND lease_until<now()
  ORDER BY lease_until,id FOR UPDATE SKIP LOCKED LIMIT 50
 ) UPDATE promotional_deliveries d SET status=CASE WHEN channel='sms' THEN 'uncertain' WHEN attempts>=5 THEN 'failed' ELSE 'queued' END,
  lease_token=NULL,lease_until=NULL,updated_at=now() FROM expired e WHERE d.id=e.id;
 WITH expired AS (
  SELECT id FROM promotional_deliveries WHERE status='queued' AND expires_at<=now()
  ORDER BY expires_at,id FOR UPDATE SKIP LOCKED LIMIT 50
 ) UPDATE promotional_deliveries d SET status='skipped',updated_at=now() FROM expired e WHERE d.id=e.id;
 RETURN QUERY WITH candidates AS (
  SELECT id FROM promotional_deliveries WHERE status='queued' AND available_at<=now() AND expires_at>now()
  ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(coalesce(p_limit,20),50))
 ) UPDATE promotional_deliveries d SET status='sending',attempts=attempts+1,
  lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now()
 FROM candidates c WHERE d.id=c.id RETURNING d.*;
END;$$;
REVOKE ALL ON FUNCTION public.claim_promotional_deliveries(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_promotional_deliveries(integer) TO service_role;
COMMIT;
