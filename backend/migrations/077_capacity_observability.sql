-- Private, shared 15-second snapshot. Scraping N replicas does not execute N
-- expensive queue aggregations. Counts saturate at 10001; cap flags are explicit.
CREATE TABLE IF NOT EXISTS public.capacity_sample (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),snapshot jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE public.capacity_sample ENABLE ROW LEVEL SECURITY;
INSERT INTO public.capacity_sample(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS customer_notifications_unsent_metrics_idx ON public.customer_notifications(next_attempt_at) WHERE push_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS trip_refunds_pending_metrics_idx ON public.trip_refunds(next_attempt_at) WHERE status IN ('queued','processing');
CREATE OR REPLACE FUNCTION public.capacity_snapshot() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cached jsonb; values_json jsonb; n bigint; oldest timestamptz; connections bigint; active bigint; waits bigint; age double precision; stats record;
BEGIN
 SELECT snapshot INTO cached FROM public.capacity_sample WHERE id=true;
 IF (cached->>'sampled_at')::timestamptz > clock_timestamp()-interval '15 seconds' THEN RETURN cached; END IF;
 IF NOT pg_try_advisory_xact_lock(77654321) THEN RETURN cached; END IF;
 -- Recheck after acquiring the sample lock; another sampler may have committed.
 SELECT snapshot INTO cached FROM public.capacity_sample WHERE id=true;
 IF (cached->>'sampled_at')::timestamptz > clock_timestamp()-interval '15 seconds' THEN RETURN cached; END IF;
 values_json:='{}';
 SELECT count(*) INTO n FROM (SELECT 1 FROM public.inventory_reservations WHERE state='held' AND expires_at<=now() LIMIT 10001) q;
 SELECT expires_at INTO oldest FROM public.inventory_reservations WHERE state='held' AND expires_at<=now() ORDER BY expires_at LIMIT 1;
 values_json:=values_json||jsonb_build_object('expired_reservations',n,'expired_reservations_capped',CASE WHEN n=10001 THEN 1 ELSE 0 END,
  'oldest_expired_reservation_seconds',coalesce(greatest(0,extract(epoch FROM now()-oldest)),0));
 SELECT count(*) INTO n FROM (SELECT 1 FROM public.customer_notifications WHERE push_sent_at IS NULL LIMIT 10001) q;
 values_json:=values_json||jsonb_build_object('notification_backlog',n,'notification_backlog_capped',CASE WHEN n=10001 THEN 1 ELSE 0 END);
 SELECT count(*) INTO n FROM (SELECT 1 FROM public.trip_refunds WHERE status IN ('queued','processing') LIMIT 10001) q;
 values_json:=values_json||jsonb_build_object('refund_backlog',n,'refund_backlog_capped',CASE WHEN n=10001 THEN 1 ELSE 0 END);
 SELECT count(*) INTO n FROM (SELECT 1 FROM public.payout_release_work WHERE completed_at IS NULL LIMIT 10001) q;
 values_json:=values_json||jsonb_build_object('payout_release_backlog',n,'payout_release_backlog_capped',CASE WHEN n=10001 THEN 1 ELSE 0 END);
 SELECT count(*) INTO n FROM public.scheduled_work WHERE coalesce(retry_at,next_run_at)<now()-interval '60 seconds';
 values_json:=values_json||jsonb_build_object('overdue_scheduled_jobs',n);
 SELECT count(*),count(*) FILTER(WHERE state='active'),count(*) FILTER(WHERE wait_event_type='Lock'),
  coalesce(max(extract(epoch FROM clock_timestamp()-query_start)) FILTER(WHERE wait_event_type='Lock'),0)
 INTO connections,active,waits,age FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid();
 SELECT xact_commit,xact_rollback,blks_read,blks_hit,deadlocks INTO stats FROM pg_stat_database WHERE datname=current_database();
 values_json:=values_json||jsonb_build_object('connections',connections,'active_connections',active,'lock_waiters',waits,'oldest_lock_wait_query_seconds',age,
 'transaction_commits',stats.xact_commit,'transaction_rollbacks',stats.xact_rollback,'blocks_read',stats.blks_read,'blocks_hit',stats.blks_hit,'deadlocks',stats.deadlocks);
 cached:=jsonb_build_object('sampled_at',clock_timestamp(),'values',values_json);
 UPDATE public.capacity_sample SET snapshot=cached WHERE id=true;
 RETURN cached;
END $$;
REVOKE ALL ON TABLE public.capacity_sample FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.capacity_snapshot() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capacity_snapshot() TO service_role;
