-- Per-product "₹63.6/kg" line on the customer product card (2026-11-04).
-- Off by default; the admin switches it on for loose/bulk staples (atta,
-- rice, oil) where comparing pack sizes by price per kg/L helps. The number
-- itself is computed in the app from each size's price and quantity.
BEGIN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS show_unit_price boolean NOT NULL DEFAULT false;
COMMIT;
NOTIFY pgrst, 'reload schema';
