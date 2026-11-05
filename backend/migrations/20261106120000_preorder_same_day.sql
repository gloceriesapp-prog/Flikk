-- Pre-orders can be booked for any of the next 5 days starting today
-- (backend/src/lib/preorders.ts PREORDER_BOOKING_DAYS), so a product's notice
-- is 0 (same day) to 4 days. New products default to same day.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

UPDATE public.products SET preorder_lead_days = 4 WHERE preorder_lead_days > 4;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_preorder_check;
ALTER TABLE public.products ADD CONSTRAINT products_preorder_check
  CHECK (preorder_min_qty BETWEEN 1 AND 999 AND preorder_lead_days BETWEEN 0 AND 4);
ALTER TABLE public.products ALTER COLUMN preorder_lead_days SET DEFAULT 0;

COMMIT;
NOTIFY pgrst, 'reload schema';
