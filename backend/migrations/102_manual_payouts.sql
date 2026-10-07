-- Manual payouts (backend/PAYOUTS.md). RazorpayX is removed: the founder pays
-- each weekly payouts / rider_payouts row outside the app and records the UTR.
-- 1. payouts / rider_payouts: utr, payment_mode, payee_snapshot, paid_by,
--    payment_note; 'processing' status removed (rows return to 'pending');
--    paid rows must carry utr/mode/paid_at/snapshot; UTR unique per table.
-- 2. stores / riders: payout_details_status + verified_* + payout_proof_path;
--    payout_method values become 'upi' | 'bank'; any change to the payout
--    destination resets verification (trigger).
-- 3. Drops RazorpayX columns, payout_release_work and its RPCs.
-- 4. RPCs mark_payout_paid / set_payee_verification (service_role only).
--    Errors: ERRCODE P0001, MESSAGE starts with the contract code
--    (PAYOUT_ALREADY_PAID, UTR_ALREADY_USED, INVALID_UTR, NOTHING_TO_PAY, ...).
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- RazorpayX release machinery ------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_payout_releases(text,text,integer);
DROP FUNCTION IF EXISTS public.renew_payout_release(uuid,uuid);
DROP FUNCTION IF EXISTS public.finish_payout_release(uuid,uuid,text,text);
DROP FUNCTION IF EXISTS public.settle_payout_webhook(uuid,text,text);
DROP TABLE IF EXISTS public.payout_release_work;

-- capacity_snapshot (081) read payout_release_work; same function without it.
CREATE OR REPLACE FUNCTION public.capacity_snapshot() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cached jsonb; values_json jsonb; n bigint; oldest timestamptz; connections bigint; active bigint; waits bigint; age double precision; stats record;
BEGIN
 SELECT snapshot INTO cached FROM public.capacity_sample WHERE id=true;
 IF (cached->>'sampled_at')::timestamptz > clock_timestamp()-interval '15 seconds' THEN RETURN cached; END IF;
 IF NOT pg_try_advisory_xact_lock(77654321) THEN RETURN cached; END IF;
 SELECT snapshot INTO cached FROM public.capacity_sample WHERE id=true;
 IF (cached->>'sampled_at')::timestamptz > clock_timestamp()-interval '15 seconds' THEN RETURN cached; END IF;
 values_json:='{}';
 SELECT count(*) INTO n FROM (SELECT 1 FROM public.inventory_reservations WHERE state='held' AND expires_at<=now() LIMIT 10001) q;
 SELECT expires_at INTO oldest FROM public.inventory_reservations WHERE state='held' AND expires_at<=now() ORDER BY expires_at LIMIT 1;
 values_json:=values_json||jsonb_build_object('expired_reservations',n,'expired_reservations_capped',CASE WHEN n=10001 THEN 1 ELSE 0 END,
  'oldest_expired_reservation_seconds',coalesce(greatest(0,extract(epoch FROM now()-oldest)),0));
 SELECT count(*) INTO n FROM (SELECT 1 FROM public.customer_notifications WHERE push_sent_at IS NULL LIMIT 10001) q;
 values_json:=values_json||jsonb_build_object('notification_backlog',n,'notification_backlog_capped',CASE WHEN n=10001 THEN 1 ELSE 0 END);
 SELECT count(*) INTO n FROM (SELECT 1 FROM (SELECT 1 FROM public.trip_refunds WHERE status IN ('queued','processing') UNION ALL SELECT 1 FROM public.order_refund_jobs WHERE status IN ('queued','processing')) pending LIMIT 10001) q;
 values_json:=values_json||jsonb_build_object('refund_backlog',n,'refund_backlog_capped',CASE WHEN n=10001 THEN 1 ELSE 0 END);
 SELECT count(*) INTO n FROM (SELECT 1 FROM public.order_refund_jobs WHERE status IN('queued','processing') LIMIT 10001) q;
 SELECT created_at INTO oldest FROM public.order_refund_jobs WHERE status IN('queued','processing') ORDER BY created_at LIMIT 1;
 values_json:=values_json||jsonb_build_object('order_refund_backlog',n,'order_refund_backlog_capped',CASE WHEN n=10001 THEN 1 ELSE 0 END,
  'oldest_order_refund_seconds',coalesce(greatest(0,extract(epoch FROM now()-oldest)),0));
 SELECT count(*) INTO n FROM (SELECT 1 FROM public.order_refund_jobs WHERE status='failed' LIMIT 10001) q;
 values_json:=values_json||jsonb_build_object('order_refund_failed',n,'order_refund_failed_capped',CASE WHEN n=10001 THEN 1 ELSE 0 END);
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
REVOKE ALL ON FUNCTION public.capacity_snapshot() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capacity_snapshot() TO service_role;
UPDATE public.capacity_sample SET snapshot='{}' WHERE id=true;

ALTER TABLE public.stores DROP COLUMN IF EXISTS razorpay_contact_id, DROP COLUMN IF EXISTS razorpay_fund_account_id;
ALTER TABLE public.riders DROP COLUMN IF EXISTS razorpay_contact_id, DROP COLUMN IF EXISTS razorpay_fund_account_id;
ALTER TABLE public.payouts DROP COLUMN IF EXISTS razorpay_payout_id;
ALTER TABLE public.rider_payouts DROP COLUMN IF EXISTS razorpay_payout_id;

-- Payout rows ------------------------------------------------------------------
ALTER TABLE public.payouts
 ADD COLUMN IF NOT EXISTS paid_at timestamptz,
 ADD COLUMN IF NOT EXISTS utr text,
 ADD COLUMN IF NOT EXISTS payment_mode text,
 ADD COLUMN IF NOT EXISTS payee_snapshot jsonb,
 ADD COLUMN IF NOT EXISTS paid_by uuid,
 ADD COLUMN IF NOT EXISTS payment_note text;
ALTER TABLE public.rider_payouts
 ADD COLUMN IF NOT EXISTS utr text,
 ADD COLUMN IF NOT EXISTS payment_mode text,
 ADD COLUMN IF NOT EXISTS payee_snapshot jsonb,
 ADD COLUMN IF NOT EXISTS paid_by uuid,
 ADD COLUMN IF NOT EXISTS payment_note text;

-- Never-settled RazorpayX transfers go back to the manual queue.
UPDATE public.payouts SET status='pending' WHERE status='processing';
UPDATE public.rider_payouts SET status='pending' WHERE status='processing';

-- Old status checks were auto-named / named differently across environments.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conrelid::regclass AS tbl, conname FROM pg_constraint
  WHERE contype='c' AND conrelid IN ('public.payouts'::regclass,'public.rider_payouts'::regclass)
   AND pg_get_constraintdef(oid) LIKE '%processing%' LOOP
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
 END LOOP;
END $$;

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_status_check,
 DROP CONSTRAINT IF EXISTS payouts_utr_format, DROP CONSTRAINT IF EXISTS payouts_payment_mode_check,
 DROP CONSTRAINT IF EXISTS payouts_payment_note_length, DROP CONSTRAINT IF EXISTS payouts_paid_requires_utr;
ALTER TABLE public.payouts
 ADD CONSTRAINT payouts_status_check CHECK (status IN ('pending','paid','blocked','failed')),
 ADD CONSTRAINT payouts_utr_format CHECK (utr IS NULL OR utr ~ '^[A-Z0-9]{6,35}$'),
 ADD CONSTRAINT payouts_payment_mode_check CHECK (payment_mode IS NULL OR payment_mode IN ('upi','bank_transfer')),
 ADD CONSTRAINT payouts_payment_note_length CHECK (payment_note IS NULL OR length(payment_note) <= 500),
 -- NOT VALID: legacy zero-amount rows auto-marked paid by the old release
 -- worker have no UTR. Every new or updated row is still checked.
 ADD CONSTRAINT payouts_paid_requires_utr CHECK (status <> 'paid' OR (utr IS NOT NULL AND payment_mode IS NOT NULL AND paid_at IS NOT NULL AND payee_snapshot IS NOT NULL)) NOT VALID;

ALTER TABLE public.rider_payouts DROP CONSTRAINT IF EXISTS rider_payouts_status_check,
 DROP CONSTRAINT IF EXISTS rider_payouts_utr_format, DROP CONSTRAINT IF EXISTS rider_payouts_payment_mode_check,
 DROP CONSTRAINT IF EXISTS rider_payouts_payment_note_length, DROP CONSTRAINT IF EXISTS rider_payouts_paid_requires_utr;
ALTER TABLE public.rider_payouts
 ADD CONSTRAINT rider_payouts_status_check CHECK (status IN ('pending','paid','blocked','failed')),
 ADD CONSTRAINT rider_payouts_utr_format CHECK (utr IS NULL OR utr ~ '^[A-Z0-9]{6,35}$'),
 ADD CONSTRAINT rider_payouts_payment_mode_check CHECK (payment_mode IS NULL OR payment_mode IN ('upi','bank_transfer')),
 ADD CONSTRAINT rider_payouts_payment_note_length CHECK (payment_note IS NULL OR length(payment_note) <= 500),
 ADD CONSTRAINT rider_payouts_paid_requires_utr CHECK (status <> 'paid' OR (utr IS NOT NULL AND payment_mode IS NOT NULL AND paid_at IS NOT NULL AND payee_snapshot IS NOT NULL)) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS payouts_utr_unique ON public.payouts(utr) WHERE utr IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rider_payouts_utr_unique ON public.rider_payouts(utr) WHERE utr IS NOT NULL;

-- Payees -------------------------------------------------------------------------
ALTER TABLE public.stores
 ADD COLUMN IF NOT EXISTS payout_account_holder_name text,
 ADD COLUMN IF NOT EXISTS payout_bank_name text,
 ADD COLUMN IF NOT EXISTS payout_upi_verified_name text,
 ADD COLUMN IF NOT EXISTS payout_details_status text NOT NULL DEFAULT 'unverified',
 ADD COLUMN IF NOT EXISTS payout_details_verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS payout_details_verified_by uuid,
 ADD COLUMN IF NOT EXISTS payout_proof_path text;
ALTER TABLE public.riders
 ADD COLUMN IF NOT EXISTS payout_account_holder_name text,
 ADD COLUMN IF NOT EXISTS payout_bank_name text,
 ADD COLUMN IF NOT EXISTS payout_upi_verified_name text,
 ADD COLUMN IF NOT EXISTS payout_details_status text NOT NULL DEFAULT 'unverified',
 ADD COLUMN IF NOT EXISTS payout_details_verified_at timestamptz,
 ADD COLUMN IF NOT EXISTS payout_details_verified_by uuid,
 ADD COLUMN IF NOT EXISTS payout_proof_path text;

DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conrelid::regclass AS tbl, conname FROM pg_constraint
  WHERE contype='c' AND conrelid IN ('public.stores'::regclass,'public.riders'::regclass)
   AND pg_get_constraintdef(oid) LIKE '%payout_method%' LOOP
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
 END LOOP;
END $$;
-- Old API value 'bank_account' becomes the contract's 'bank'. Updated before
-- the reset trigger exists, so this rename alone never unverifies anyone.
UPDATE public.stores SET payout_method='bank' WHERE payout_method='bank_account';
UPDATE public.riders SET payout_method='bank' WHERE payout_method='bank_account';
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_payout_details_status_check;
ALTER TABLE public.stores
 ADD CONSTRAINT stores_payout_method_check CHECK (payout_method IS NULL OR payout_method IN ('upi','bank')),
 ADD CONSTRAINT stores_payout_details_status_check CHECK (payout_details_status IN ('unverified','verified'));
ALTER TABLE public.riders DROP CONSTRAINT IF EXISTS riders_payout_details_status_check;
ALTER TABLE public.riders
 ADD CONSTRAINT riders_payout_method_check CHECK (payout_method IS NULL OR payout_method IN ('upi','bank')),
 ADD CONSTRAINT riders_payout_details_status_check CHECK (payout_details_status IN ('unverified','verified'));

-- A verified flag never carries over to a different destination.
CREATE OR REPLACE FUNCTION public.reset_payout_verification() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF (NEW.payout_method, NEW.payout_upi_id, NEW.payout_bank_account_number, NEW.payout_bank_ifsc,
     NEW.payout_bank_name, NEW.payout_account_holder_name, NEW.payout_proof_path)
  IS DISTINCT FROM
    (OLD.payout_method, OLD.payout_upi_id, OLD.payout_bank_account_number, OLD.payout_bank_ifsc,
     OLD.payout_bank_name, OLD.payout_account_holder_name, OLD.payout_proof_path) THEN
  NEW.payout_details_status := 'unverified';
  NEW.payout_details_verified_at := NULL;
  NEW.payout_details_verified_by := NULL;
  NEW.payout_upi_verified_name := NULL;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reset_payout_verification() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS stores_reset_payout_verification ON public.stores;
CREATE TRIGGER stores_reset_payout_verification BEFORE UPDATE ON public.stores
 FOR EACH ROW EXECUTE FUNCTION public.reset_payout_verification();
DROP TRIGGER IF EXISTS riders_reset_payout_verification ON public.riders;
CREATE TRIGGER riders_reset_payout_verification BEFORE UPDATE ON public.riders
 FOR EACH ROW EXECUTE FUNCTION public.reset_payout_verification();

-- Every app writes stores/riders through the service-role API; the old
-- stores_owner_* RLS policies would otherwise let an owner self-verify or
-- swap payout details straight through PostgREST.
REVOKE INSERT, UPDATE, DELETE ON public.stores FROM PUBLIC,anon,authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.riders FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.stores, public.riders, public.payouts, public.rider_payouts TO service_role;

-- RPCs -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_payout_paid(p_kind text, p_payout_id uuid, p_utr text, p_mode text, p_admin uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 v_utr text := upper(btrim(coalesce(p_utr, '')));
 v_note text := nullif(btrim(coalesce(p_note, '')), '');
 v_status text; v_old_utr text; v_amount numeric; v_payee uuid; v_snapshot jsonb; v_row jsonb;
 d record;
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('store','rider') THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INVALID_KIND: kind must be store or rider'; END IF;
 IF v_utr !~ '^[A-Z0-9]{6,35}$' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INVALID_UTR'; END IF;
 IF p_mode IS NULL OR p_mode NOT IN ('upi','bank_transfer') THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INVALID_MODE: mode must be upi or bank_transfer'; END IF;
 IF p_admin IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INVALID_ADMIN: admin id required'; END IF;
 IF v_note IS NOT NULL AND length(v_note) > 500 THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INVALID_NOTE: note is at most 500 characters'; END IF;

 IF p_kind = 'store' THEN
  SELECT status, utr, net_payout, store_id INTO v_status, v_old_utr, v_amount, v_payee FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
 ELSE
  SELECT status, utr, amount, rider_id INTO v_status, v_old_utr, v_amount, v_payee FROM public.rider_payouts WHERE id = p_payout_id FOR UPDATE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='PAYOUT_NOT_FOUND: no such payout'; END IF;

 IF v_status = 'paid' THEN
  IF v_old_utr = v_utr THEN
   IF p_kind = 'store' THEN SELECT to_jsonb(p) INTO v_row FROM public.payouts p WHERE p.id = p_payout_id;
   ELSE SELECT to_jsonb(p) INTO v_row FROM public.rider_payouts p WHERE p.id = p_payout_id; END IF;
   RETURN v_row;
  END IF;
  RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='PAYOUT_ALREADY_PAID';
 END IF;
 IF v_status NOT IN ('pending','failed') THEN
  RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='PAYOUT_NOT_PAYABLE: only pending or failed payouts can be marked paid';
 END IF;
 IF coalesce(v_amount, 0) <= 0 THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='NOTHING_TO_PAY'; END IF;
 -- ponytail: cross-table UTR check is not race-proof (per-table unique index is); one founder pays serially.
 IF EXISTS (SELECT 1 FROM public.payouts WHERE utr = v_utr AND id <> p_payout_id)
    OR EXISTS (SELECT 1 FROM public.rider_payouts WHERE utr = v_utr AND id <> p_payout_id) THEN
  RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='UTR_ALREADY_USED';
 END IF;

 -- Lock the payee so the snapshot matches the destination actually paid.
 IF p_kind = 'store' THEN
  SELECT payout_method, payout_upi_id, payout_bank_account_number, payout_bank_ifsc, payout_account_holder_name, payout_upi_verified_name
   INTO d FROM public.stores WHERE id = v_payee FOR SHARE;
 ELSE
  SELECT payout_method, payout_upi_id, payout_bank_account_number, payout_bank_ifsc, payout_account_holder_name, payout_upi_verified_name
   INTO d FROM public.riders WHERE user_id = v_payee FOR SHARE;
 END IF;
 IF NOT FOUND OR d.payout_method IS NULL
    OR (d.payout_method = 'upi' AND d.payout_upi_id IS NULL)
    OR (d.payout_method = 'bank' AND (d.payout_bank_account_number IS NULL OR d.payout_bank_ifsc IS NULL)) THEN
  RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='PAYEE_DETAILS_MISSING: payee has no payout details';
 END IF;
 v_snapshot := jsonb_strip_nulls(jsonb_build_object(
  'method', d.payout_method,
  'upi_id', CASE WHEN d.payout_method = 'upi' THEN d.payout_upi_id END,
  'account_last4', CASE WHEN d.payout_method = 'bank' THEN right(d.payout_bank_account_number, 4) END,
  'ifsc', CASE WHEN d.payout_method = 'bank' THEN d.payout_bank_ifsc END,
  'account_holder_name', d.payout_account_holder_name,
  'verified_name', d.payout_upi_verified_name));

 BEGIN
  IF p_kind = 'store' THEN
   UPDATE public.payouts SET status='paid', utr=v_utr, payment_mode=p_mode, paid_at=now(), payee_snapshot=v_snapshot, paid_by=p_admin, payment_note=v_note
    WHERE id = p_payout_id RETURNING to_jsonb(payouts.*) INTO v_row;
  ELSE
   UPDATE public.rider_payouts SET status='paid', utr=v_utr, payment_mode=p_mode, paid_at=now(), payee_snapshot=v_snapshot, paid_by=p_admin, payment_note=v_note
    WHERE id = p_payout_id RETURNING to_jsonb(rider_payouts.*) INTO v_row;
   -- Same earnings marker the old webhook settlement maintained.
   UPDATE public.rider_earnings SET paid_at = now() WHERE rider_payout_id = p_payout_id AND paid_at IS NULL;
  END IF;
 EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='UTR_ALREADY_USED';
 END;
 RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.set_payee_verification(p_kind text, p_payee_id uuid, p_verified boolean, p_verified_name text, p_admin uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_name text := nullif(btrim(coalesce(p_verified_name, '')), ''); v_method text;
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('store','rider') THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INVALID_KIND: kind must be store or rider'; END IF;
 IF p_verified IS NULL OR p_admin IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INVALID_INPUT: verified and admin are required'; END IF;
 IF p_verified AND (v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 100) THEN
  RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INVALID_VERIFIED_NAME: name must be 2-100 characters';
 END IF;
 IF p_kind = 'store' THEN SELECT payout_method INTO v_method FROM public.stores WHERE id = p_payee_id FOR UPDATE;
 ELSE SELECT payout_method INTO v_method FROM public.riders WHERE user_id = p_payee_id FOR UPDATE; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='PAYEE_NOT_FOUND: no such payee'; END IF;
 IF p_verified AND v_method IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='PAYEE_DETAILS_MISSING: payee has no payout details'; END IF;
 -- Only verification columns change, so the reset trigger leaves this alone.
 IF p_kind = 'store' THEN
  UPDATE public.stores SET payout_details_status = CASE WHEN p_verified THEN 'verified' ELSE 'unverified' END,
   payout_details_verified_at = CASE WHEN p_verified THEN now() END,
   payout_details_verified_by = CASE WHEN p_verified THEN p_admin END,
   payout_upi_verified_name = CASE WHEN p_verified THEN v_name END
  WHERE id = p_payee_id;
 ELSE
  UPDATE public.riders SET payout_details_status = CASE WHEN p_verified THEN 'verified' ELSE 'unverified' END,
   payout_details_verified_at = CASE WHEN p_verified THEN now() END,
   payout_details_verified_by = CASE WHEN p_verified THEN p_admin END,
   payout_upi_verified_name = CASE WHEN p_verified THEN v_name END
  WHERE user_id = p_payee_id;
 END IF;
END $$;

REVOKE ALL ON FUNCTION public.mark_payout_paid(text,uuid,text,text,uuid,text), public.set_payee_verification(text,uuid,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_payout_paid(text,uuid,text,text,uuid,text), public.set_payee_verification(text,uuid,boolean,text,uuid) TO service_role;
COMMIT;
