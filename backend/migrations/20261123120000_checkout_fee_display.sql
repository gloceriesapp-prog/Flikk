-- Comparison fees are display-only. Actual charges remain flat/tier fees and handling_fee.
ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS original_delivery_fee numeric(10,2) DEFAULT NULL CHECK (original_delivery_fee >= 0),
  ADD COLUMN IF NOT EXISTS original_handling_fee numeric(10,2) DEFAULT NULL CHECK (original_handling_fee >= 0),
  ADD COLUMN IF NOT EXISTS delivery_fee_show_free boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS handling_fee_show_free boolean NOT NULL DEFAULT true;
