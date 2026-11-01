-- Supabase performance advisor fixes (2026-11-02).
--
-- 1. Duplicate indexes. Each pair is identical, so every write maintained two
--    copies. Drop the extra one only where its twin exists, so a database
--    built from older migrations keeps exactly one.
DO $$
BEGIN
  -- orders_order_number_key is the unique constraint the order-number
  -- migration relies on; 091's orders_order_number_unique is a plain copy.
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_number_key' AND conrelid = 'public.orders'::regclass) THEN
    DROP INDEX IF EXISTS public.orders_order_number_unique;
  END IF;
  -- 077 re-created 065's trip_refunds_due under a metrics name.
  IF to_regclass('public.trip_refunds_due') IS NOT NULL THEN
    DROP INDEX IF EXISTS public.trip_refunds_pending_metrics_idx;
  END IF;
END $$;

-- 2. RLS policies that called auth.uid() once per row. Wrapping it in a
--    sub-select lets Postgres evaluate it once per statement. Same rules.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rider_payouts' AND policyname = 'rider_payouts_self') THEN
    ALTER POLICY rider_payouts_self ON public.rider_payouts
      USING (rider_id = (SELECT auth.uid()));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'reviews_store_owner_reply') THEN
    ALTER POLICY reviews_store_owner_reply ON public.reviews
      USING (store_id IN (SELECT stores.id FROM public.stores WHERE stores.owner_user_id = (SELECT auth.uid())))
      WITH CHECK (store_id IN (SELECT stores.id FROM public.stores WHERE stores.owner_user_id = (SELECT auth.uid())));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'store_onboarding_drafts' AND policyname = 'store_onboarding_drafts_legacy_baseline_read') THEN
    ALTER POLICY store_onboarding_drafts_legacy_baseline_read ON public.store_onboarding_drafts
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- 3. order_number_for only uses built-ins; pin its search_path (security
--    advisor: function_search_path_mutable).
ALTER FUNCTION public.order_number_for(bigint) SET search_path = pg_catalog;
