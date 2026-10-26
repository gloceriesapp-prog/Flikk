-- Commission by product category instead of one flat rate.
--
-- Before: every order paid platform_settings.commission_rate (6%) on its item
-- total, unless admin gave the store its own stores.commission_rate (115).
-- Stores earn 2-5% on milk, eggs and staples, so a flat 6% cost them more
-- than they made on those items.
--
-- Now each product category (products.category, the fixed list admin and the
-- partner app pick from) has its own rate, set in admin. Checkout charges each
-- line at its category's rate; a category without a rate uses the platform
-- default. A store's own rate (115) still replaces the category rates for
-- every item at that store (e.g. a negotiated flat deal). The optional
-- platform_settings.commission_cap_per_order caps one store order's
-- commission in rupees. Orders already placed keep what they were charged.
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE TABLE IF NOT EXISTS public.category_commission_rates (
 category text PRIMARY KEY CHECK (length(btrim(category)) BETWEEN 1 AND 80),
 commission_rate numeric NOT NULL CHECK (commission_rate>=0 AND commission_rate<=1),
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- The platform's take rate: like platform_settings (039), never readable
-- through the anon or user keys.
ALTER TABLE public.category_commission_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.category_commission_rates FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.category_commission_rates TO service_role;

ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS commission_cap_per_order numeric;
ALTER TABLE public.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_commission_cap_check;
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_commission_cap_check
 CHECK(commission_cap_per_order IS NULL OR commission_cap_per_order>=0);

-- Starting rates, banded by what a kirana typically earns on each category:
-- 0% where the store's margin is thinnest (dairy, bread, eggs), 2% on fresh
-- produce, meat and staples, 4% on packaged food, 8% on high-margin items.
INSERT INTO public.category_commission_rates(category,commission_rate) VALUES
 ('Dairy, Bread & Eggs',0),
 ('Vegetables & Fruits',0.02),
 ('Meat, Eggs & Fish',0.02),
 ('Atta, Rice & Dal',0.02),
 ('Oil, Ghee & Masala',0.02),
 ('Bakery & Biscuits',0.04),
 ('Snacks & Munchies',0.04),
 ('Beverages',0.04),
 ('Pharmacy',0.04),
 ('General Store',0.04),
 ('Protein & Nutrition',0.08),
 ('Household & Cleaning',0.08),
 ('Personal Care',0.08)
ON CONFLICT (category) DO NOTHING;

-- Retire the flat 6%: the default now only covers a category without its own
-- rate. Only an untouched 6% default is moved, never a rate admin chose.
UPDATE public.platform_settings SET commission_rate=0.04,updated_at=now() WHERE commission_rate=0.06;
UPDATE public.platform_settings SET commission_cap_per_order=30 WHERE commission_cap_per_order IS NULL;

NOTIFY pgrst,'reload schema';
COMMIT;
