-- Admin correction of a single mis-recorded rider earning. Requires 001
-- (rider_earnings), 050 (rider_payout_id), 108 (base/extra split). This is a
-- real-money record: amounts cross the wire as integer paise (like
-- admin_approve_trip_failure_refund in 109), the row is locked FOR UPDATE under
-- an advisory lock the same way settle_checkout_payment / mark_payout_paid lock
-- their money rows, and every correction writes an append-only audit row with
-- old/new/delta, admin email and reason.
--
-- A settled earning (paid_at set, or batched into a weekly rider_payout) is
-- refused unless the caller explicitly passes allow_settled: the cash already
-- left, so correcting it is a deliberate bookkeeping fix, not a routine edit.
-- The correction never touches paid_at or rider_payout_id — it fixes the
-- recorded amount only, keeping amount = base_amount + extra_stop_amount.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE IF NOT EXISTS public.rider_earning_corrections(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 earning_id uuid NOT NULL REFERENCES public.rider_earnings(id),
 rider_id uuid NOT NULL REFERENCES public.users(id),
 old_amount_paise bigint NOT NULL,
 new_amount_paise bigint NOT NULL CHECK(new_amount_paise > 0),
 delta_paise bigint NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 300),
 admin_email text NOT NULL CHECK(length(admin_email) BETWEEN 3 AND 320),
 was_settled boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rider_earning_corrections_earning ON public.rider_earning_corrections(earning_id,created_at DESC);
CREATE INDEX IF NOT EXISTS rider_earning_corrections_rider ON public.rider_earning_corrections(rider_id,created_at DESC);
ALTER TABLE public.rider_earning_corrections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rider_earning_corrections FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.rider_earning_corrections TO service_role;

-- Rupees are stored numeric(10,2); paise/100 is exact for two decimals. The
-- ₹100,000 ceiling is far above any real single-delivery fee and keeps a
-- fat-fingered correction from writing an absurd amount.
CREATE OR REPLACE FUNCTION public.admin_correct_rider_earning(p_earning uuid,p_new_amount_paise bigint,p_reason text,p_admin_email text,p_allow_settled boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE e rider_earnings; v_reason text:=btrim(coalesce(p_reason,'')); v_old_paise bigint;
 v_new numeric(10,2); v_extra numeric(10,2); v_settled boolean;
BEGIN
 IF coalesce(length(btrim(p_admin_email)),0) NOT BETWEEN 3 AND 320 THEN RAISE EXCEPTION USING errcode='P0422',message='Admin email required'; END IF;
 IF length(v_reason) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION USING errcode='P0422',message='A reason of 1-300 characters is required'; END IF;
 IF p_new_amount_paise IS NULL OR p_new_amount_paise <= 0 OR p_new_amount_paise > 10000000 THEN
  RAISE EXCEPTION USING errcode='P0422',message='New amount must be between 1 and 10000000 paise'; END IF;

 -- Serialize corrections to this earning the same way the payout/settlement
 -- money paths serialize their rows (admin_cancel_order's single-key advisory
 -- lock), so two admins cannot both read the old amount and double-apply.
 PERFORM pg_advisory_xact_lock(hashtextextended('rider-earning-correction:'||p_earning::text,120));
 SELECT * INTO e FROM rider_earnings WHERE id=p_earning FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404',message='Rider earning not found'; END IF;

 v_settled:=(e.paid_at IS NOT NULL OR e.rider_payout_id IS NOT NULL);
 IF v_settled AND NOT coalesce(p_allow_settled,false) THEN
  RAISE EXCEPTION USING errcode='P0409',message='This earning is already paid out; pass allow_settled to override'; END IF;

 v_old_paise:=round(e.amount*100)::bigint;
 v_new:=round(p_new_amount_paise::numeric/100,2);
 v_extra:=coalesce(e.extra_stop_amount,0);
 IF v_new < v_extra THEN RAISE EXCEPTION USING errcode='P0422',message='New amount is below the recorded extra-stop portion'; END IF;

 -- Idempotent no-op: re-sending the same amount changes nothing and is not
 -- re-audited (callers may retry on a transient network error).
 IF p_new_amount_paise = v_old_paise THEN
  RETURN jsonb_build_object('earning_id',e.id,'rider_id',e.rider_id,'old_amount_paise',v_old_paise,
   'new_amount_paise',v_old_paise,'delta_paise',0,'was_settled',v_settled,'changed',false);
 END IF;

 UPDATE rider_earnings SET amount=v_new,base_amount=v_new-v_extra WHERE id=e.id;
 INSERT INTO rider_earning_corrections(earning_id,rider_id,old_amount_paise,new_amount_paise,delta_paise,reason,admin_email,was_settled)
 VALUES(e.id,e.rider_id,v_old_paise,p_new_amount_paise,p_new_amount_paise-v_old_paise,v_reason,lower(btrim(p_admin_email)),v_settled);
 RETURN jsonb_build_object('earning_id',e.id,'rider_id',e.rider_id,'old_amount_paise',v_old_paise,
  'new_amount_paise',p_new_amount_paise,'delta_paise',p_new_amount_paise-v_old_paise,'was_settled',v_settled,'changed',true);
END $function$;
REVOKE ALL ON FUNCTION public.admin_correct_rider_earning(uuid,bigint,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_correct_rider_earning(uuid,bigint,text,text,boolean) TO service_role;

COMMIT;
