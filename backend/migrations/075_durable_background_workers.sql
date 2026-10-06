CREATE TABLE IF NOT EXISTS public.scheduled_work (
 name text PRIMARY KEY, interval_seconds integer NOT NULL CHECK(interval_seconds>0),
 catch_up boolean NOT NULL DEFAULT false, next_run_at timestamptz NOT NULL,
 retry_at timestamptz, lease_token uuid, lease_until timestamptz,
 attempts integer NOT NULL DEFAULT 0, last_error text, last_success_at timestamptz
);
ALTER TABLE public.scheduled_work ENABLE ROW LEVEL SECURITY;
INSERT INTO public.scheduled_work(name,interval_seconds,catch_up,next_run_at) VALUES
 ('weeklyPayouts',604800,true,(date_trunc('week',now() AT TIME ZONE 'Asia/Kolkata')+interval '9 hours') AT TIME ZONE 'Asia/Kolkata'),
 ('weeklyRiderPayouts',604800,true,(date_trunc('week',now() AT TIME ZONE 'Asia/Kolkata')+interval '9 hours 30 minutes') AT TIME ZONE 'Asia/Kolkata'),
 ('expireUnpaidOrders',300,false,now()),('riderDispatch',60,false,now())
ON CONFLICT(name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_scheduled_work(p_limit integer DEFAULT 1)
RETURNS TABLE(name text,lease_token uuid,scheduled_for timestamptz,attempts integer)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH due AS (
 SELECT w.name FROM public.scheduled_work w
 WHERE coalesce(w.retry_at,w.next_run_at)<=now() AND (w.lease_until IS NULL OR w.lease_until<now())
 ORDER BY coalesce(w.retry_at,w.next_run_at),w.name LIMIT least(greatest(p_limit,1),7) FOR UPDATE SKIP LOCKED
 ) UPDATE public.scheduled_work w SET lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=w.attempts+1
 FROM due WHERE w.name=due.name RETURNING w.name,w.lease_token,w.next_run_at,w.attempts;
$$;
CREATE OR REPLACE FUNCTION public.renew_scheduled_work(p_name text,p_token uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH renewed AS (UPDATE public.scheduled_work SET lease_until=now()+interval '2 minutes'
 WHERE name=p_name AND lease_token=p_token AND lease_until>now() RETURNING name) SELECT EXISTS(SELECT 1 FROM renewed);
$$;
CREATE OR REPLACE FUNCTION public.finish_scheduled_work(p_name text,p_token uuid,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH done AS (UPDATE public.scheduled_work w SET
 next_run_at=CASE WHEN p_error IS NOT NULL THEN w.next_run_at WHEN w.catch_up THEN w.next_run_at+make_interval(secs=>w.interval_seconds) ELSE now()+make_interval(secs=>w.interval_seconds) END,
 retry_at=CASE WHEN p_error IS NULL THEN NULL ELSE now()+make_interval(secs=>least(900,5*power(2,least(w.attempts,7)))::integer)+random()*interval '5 seconds' END,
 last_error=left(p_error,500),last_success_at=CASE WHEN p_error IS NULL THEN now() ELSE w.last_success_at END,
 attempts=CASE WHEN p_error IS NULL THEN 0 ELSE w.attempts END,lease_token=NULL,lease_until=NULL
 WHERE w.name=p_name AND w.lease_token=p_token AND w.lease_until>now() RETURNING name)
 SELECT EXISTS(SELECT 1 FROM done);
$$;

-- Aggregate the complete settlement in SQL: Supabase row caps must not omit
-- delivered orders from a large week. Unique (store,week) prevents repeats.
CREATE OR REPLACE FUNCTION public.compute_store_payouts(p_start timestamptz,p_end timestamptz,p_start_date date,p_end_date date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF p_end<=p_start OR p_end-p_start<>interval '7 days'
 OR p_start_date<>(p_start AT TIME ZONE 'Asia/Kolkata')::date OR p_end_date<>(p_end AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Invalid settlement week'; END IF;
 INSERT INTO public.payouts(store_id,week_start,week_end,gross_amount,commission_deducted,net_payout,status)
 SELECT store_id,p_start_date,p_end_date,sum(item_total),sum(commission_amount),round(sum(item_total)-sum(commission_amount),2),'pending'
 FROM public.orders WHERE status='delivered' AND delivered_at>=p_start AND delivered_at<p_end GROUP BY store_id
 ON CONFLICT(store_id,week_start) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
CREATE INDEX IF NOT EXISTS orders_delivered_settlement_idx ON public.orders(delivered_at,store_id) WHERE status='delivered';

-- Freeze provider request bodies BEFORE sending money. A crash after HTTP
-- acceptance retries the same UUID idempotency key AND identical body.
CREATE TABLE IF NOT EXISTS public.payout_release_work (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('store','rider')),
 payout_id uuid NOT NULL, request jsonb NOT NULL, completed_at timestamptz,
 lease_token uuid, lease_until timestamptz,next_attempt_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0,last_error text, UNIQUE(kind,payout_id)
);
ALTER TABLE public.payout_release_work ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS payout_release_due_idx ON public.payout_release_work(next_attempt_at) WHERE completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_payout_releases(p_kind text,p_account text,p_limit integer DEFAULT 25)
RETURNS SETOF public.payout_release_work LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r record; dest record; payload jsonb;
BEGIN
 IF p_kind NOT IN ('store','rider') OR p_account IS NULL OR length(p_account)<1 THEN RAISE EXCEPTION 'Invalid payout release configuration'; END IF;
 -- Lock pending payout rows before converting them into durable transfers.
 -- Retry a missing response from existing work, never create a new key.
 FOR r IN EXECUTE CASE WHEN p_kind='store' THEN
  'SELECT id,store_id AS recipient,net_payout AS amount FROM public.payouts WHERE status=''pending'' ORDER BY week_start,id LIMIT $1 FOR UPDATE SKIP LOCKED'
 ELSE 'SELECT id,rider_id AS recipient,amount FROM public.rider_payouts WHERE status=''pending'' ORDER BY week_start,id LIMIT $1 FOR UPDATE SKIP LOCKED' END
 USING least(greatest(p_limit,1),50)
 LOOP
  IF p_kind='store' THEN SELECT payout_method,razorpay_fund_account_id INTO dest FROM public.stores WHERE id=r.recipient;
  ELSE SELECT payout_method,razorpay_fund_account_id INTO dest FROM public.riders WHERE user_id=r.recipient; END IF;
  IF r.amount<=0 THEN
   EXECUTE format('UPDATE public.%I SET status=''paid'',paid_at=now() WHERE id=$1',CASE WHEN p_kind='store' THEN 'payouts' ELSE 'rider_payouts' END) USING r.id;
   IF p_kind='rider' THEN UPDATE public.rider_earnings SET paid_at=now() WHERE rider_payout_id=r.id; END IF;
   CONTINUE;
  END IF;
  IF dest.payout_method IS NULL OR dest.razorpay_fund_account_id IS NULL THEN
   EXECUTE format('UPDATE public.%I SET status=''blocked'' WHERE id=$1',CASE WHEN p_kind='store' THEN 'payouts' ELSE 'rider_payouts' END) USING r.id;
   CONTINUE;
  END IF;
  payload:=jsonb_build_object('account_number',p_account,'fund_account_id',dest.razorpay_fund_account_id,
   'amount',round(r.amount*100),'currency','INR','mode',CASE WHEN dest.payout_method='upi' THEN 'UPI' ELSE 'IMPS' END,
   'purpose','payout','queue_if_low_balance',true,'reference_id',r.id,'narration','Gloceries weekly settlement');
  INSERT INTO public.payout_release_work(kind,payout_id,request) VALUES(p_kind,r.id,payload) ON CONFLICT(kind,payout_id) DO NOTHING;
  EXECUTE format('UPDATE public.%I SET status=''processing'' WHERE id=$1 AND status=''pending''',CASE WHEN p_kind='store' THEN 'payouts' ELSE 'rider_payouts' END) USING r.id;
 END LOOP;
 RETURN QUERY WITH due AS (
  SELECT w.id FROM public.payout_release_work w WHERE w.kind=p_kind AND w.completed_at IS NULL
   AND w.next_attempt_at<=now() AND (w.lease_until IS NULL OR w.lease_until<now())
   -- A terminal webhook or manual resolution prevents another submission.
   AND CASE WHEN p_kind='store' THEN EXISTS(SELECT 1 FROM public.payouts p WHERE p.id=w.payout_id AND p.status='processing')
        ELSE EXISTS(SELECT 1 FROM public.rider_payouts p WHERE p.id=w.payout_id AND p.status='processing') END
  ORDER BY w.next_attempt_at,w.id LIMIT least(greatest(p_limit,1),50) FOR UPDATE SKIP LOCKED
 ) UPDATE public.payout_release_work w SET lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',attempts=w.attempts+1
 FROM due WHERE w.id=due.id RETURNING w.*;
END $$;

CREATE OR REPLACE FUNCTION public.finish_payout_release(p_id uuid,p_token uuid,p_provider_id text DEFAULT NULL,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE w public.payout_release_work;
BEGIN
 SELECT * INTO w FROM public.payout_release_work WHERE id=p_id AND lease_token=p_token AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_provider_id IS NOT NULL THEN
  EXECUTE format('UPDATE public.%I SET razorpay_payout_id=$1 WHERE id=$2',CASE WHEN w.kind='store' THEN 'payouts' ELSE 'rider_payouts' END) USING p_provider_id,w.payout_id;
 END IF;
 UPDATE public.payout_release_work SET completed_at=CASE WHEN p_provider_id IS NOT NULL THEN now() ELSE NULL END,
  last_error=left(p_error,500),lease_token=NULL,lease_until=NULL,
  next_attempt_at=now()+make_interval(secs=>least(900,15*power(2,least(w.attempts,6)))::integer)
 WHERE id=w.id;
 RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.claim_scheduled_work(integer),public.renew_scheduled_work(text,uuid),public.finish_scheduled_work(text,uuid,text),public.compute_store_payouts(timestamptz,timestamptz,date,date),public.claim_payout_releases(text,text,integer),public.finish_payout_release(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_scheduled_work(integer),public.renew_scheduled_work(text,uuid),public.finish_scheduled_work(text,uuid,text),public.compute_store_payouts(timestamptz,timestamptz,date,date),public.claim_payout_releases(text,text,integer),public.finish_payout_release(uuid,uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.renew_payout_release(p_id uuid,p_token uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH renewed AS (UPDATE public.payout_release_work SET lease_until=now()+interval '3 minutes'
 WHERE id=p_id AND lease_token=p_token AND lease_until>now() RETURNING id) SELECT EXISTS(SELECT 1 FROM renewed);
$$;
REVOKE ALL ON FUNCTION public.renew_payout_release(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.renew_payout_release(uuid,uuid) TO service_role;
CREATE INDEX IF NOT EXISTS orders_dispatch_due_idx ON public.orders(dispatch_broadcast_at,id)
 WHERE status='packed' AND rider_id IS NULL;
CREATE OR REPLACE FUNCTION public.advance_dispatch_offers(p_limit integer DEFAULT 100,p_order uuid DEFAULT NULL)
RETURNS TABLE(id uuid,store_id uuid,store_name text,lat double precision,lng double precision,radius_m integer)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH due AS (
  SELECT o.id FROM public.orders o JOIN public.stores s ON s.id=o.store_id
  WHERE o.status='packed' AND o.rider_id IS NULL
   AND s.lat BETWEEN -90 AND 90 AND s.lng BETWEEN -180 AND 180
   AND (p_order IS NULL OR o.id=p_order)
   AND (o.dispatch_broadcast_at IS NULL OR (p_order IS NULL AND o.dispatch_broadcast_at<now()-interval '45 seconds' AND coalesce(o.dispatch_radius_m,3000)<8000))
  ORDER BY o.dispatch_broadcast_at NULLS FIRST,o.id LIMIT least(greatest(p_limit,1),100) FOR UPDATE OF o SKIP LOCKED
 ), advanced AS (
 UPDATE public.orders o SET dispatch_radius_m=CASE WHEN o.dispatch_broadcast_at IS NULL THEN 3000 WHEN coalesce(o.dispatch_radius_m,3000)<5000 THEN 5000 ELSE 8000 END,dispatch_broadcast_at=now()
 FROM due WHERE o.id=due.id RETURNING o.id,o.store_id,o.dispatch_radius_m
 ) SELECT a.id,a.store_id,s.name,s.lat,s.lng,a.dispatch_radius_m FROM advanced a JOIN public.stores s ON s.id=a.store_id;
$$;
REVOKE ALL ON FUNCTION public.advance_dispatch_offers(integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.advance_dispatch_offers(integer,uuid) TO service_role;
-- Payout and earning settlement must commit together, including reversals.
CREATE OR REPLACE FUNCTION public.settle_payout_webhook(p_reference uuid,p_provider text,p_event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE k text; tbl text; old_status text; provider text; desired text;
BEGIN
 IF p_event NOT IN ('payout.processed','payout.failed','payout.reversed') OR p_provider IS NULL THEN RAISE EXCEPTION 'Invalid payout event'; END IF;
 desired:=CASE WHEN p_event='payout.processed' THEN 'paid' ELSE 'failed' END;
 -- Durable work identifies the recipient kind. Legacy transfers are matched
 -- by the actual stored provider ID, not only a user-defined reference.
 FOR k IN SELECT kind FROM public.payout_release_work WHERE payout_id=p_reference
 UNION SELECT 'store' WHERE EXISTS(SELECT 1 FROM public.payouts WHERE id=p_reference AND razorpay_payout_id=p_provider)
 UNION SELECT 'rider' WHERE EXISTS(SELECT 1 FROM public.rider_payouts WHERE id=p_reference AND razorpay_payout_id=p_provider)
 LOOP
  tbl:=CASE WHEN k='store' THEN 'payouts' ELSE 'rider_payouts' END;
  EXECUTE format('SELECT status,razorpay_payout_id FROM public.%I WHERE id=$1 FOR UPDATE',tbl) INTO old_status,provider USING p_reference;
  IF old_status IS NULL OR (provider IS NOT NULL AND provider<>p_provider) THEN CONTINUE; END IF;
  IF old_status='processing' OR (old_status='paid' AND p_event='payout.reversed') THEN
   EXECUTE format('UPDATE public.%I SET status=$1,razorpay_payout_id=$2,paid_at=CASE WHEN $1=''paid'' THEN coalesce(paid_at,now()) ELSE NULL END WHERE id=$3',tbl)
     USING desired,p_provider,p_reference;
   IF k='rider' THEN UPDATE public.rider_earnings SET paid_at=CASE WHEN desired='paid' THEN coalesce(paid_at,now()) ELSE NULL END WHERE rider_payout_id=p_reference; END IF;
   UPDATE public.payout_release_work SET completed_at=now() WHERE kind=k AND payout_id=p_reference;
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.settle_payout_webhook(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payout_webhook(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.background_worker_ready()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT count(*)=4 FROM public.scheduled_work WHERE name IN ('weeklyPayouts','weeklyRiderPayouts','expireUnpaidOrders','riderDispatch');
$$;
REVOKE ALL ON FUNCTION public.background_worker_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.background_worker_ready() TO service_role;
