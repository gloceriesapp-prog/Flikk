BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.checkout_payment_sessions
  ADD COLUMN upi_resume_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN upi_resume_verified_at timestamptz;

-- A fresh provider read supplies this short-lived UI eligibility snapshot.
-- Intent creation still rechecks Razorpay; this never authorizes settlement.
CREATE FUNCTION public.invalidate_upi_resume_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  NEW.upi_resume_allowed:=false;
  NEW.upi_resume_verified_at:=NULL;
  RETURN NEW;
END $$;
CREATE TRIGGER invalidate_upi_resume_snapshot
BEFORE UPDATE OF upi_state,upi_payment_id ON public.checkout_payment_sessions
FOR EACH ROW WHEN (OLD.upi_state IS DISTINCT FROM NEW.upi_state
  OR OLD.upi_payment_id IS DISTINCT FROM NEW.upi_payment_id)
EXECUTE FUNCTION public.invalidate_upi_resume_snapshot();
REVOKE ALL ON FUNCTION public.invalidate_upi_resume_snapshot() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.invalidate_upi_resume_snapshot() TO service_role;
COMMIT;
