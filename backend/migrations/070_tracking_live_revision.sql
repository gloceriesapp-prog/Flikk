-- Monotonic versions prevent a late status poll from overwriting a newer
-- cancellation/payment/detail response. Static detail endpoints select *.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS live_revision bigint NOT NULL DEFAULT 1;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS live_revision bigint NOT NULL DEFAULT 1;
CREATE OR REPLACE FUNCTION public.bump_tracking_revision()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.live_revision := OLD.live_revision + 1; RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS tracking_live_revision ON public.orders;
CREATE TRIGGER tracking_live_revision BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.bump_tracking_revision();
DROP TRIGGER IF EXISTS tracking_live_revision ON public.trips;
CREATE TRIGGER tracking_live_revision BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.bump_tracking_revision();
COMMIT;
