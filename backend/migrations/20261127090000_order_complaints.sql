-- Customer complaints on orders (2026-11-27). Customer care runs by email,
-- so an admin marks an order when the customer complained about it
-- (missing items, damage, a bad delivery), from the admin order page.
--
-- 1. orders.complaint_reported_at: when it was marked; null = no complaint.
--    The customer app's store-review prompt skips orders that have it
--    (apps/customer/src/features/store-review/decision.ts). GET /orders/:id
--    and GET /trips/:id already return orders.*; no API change needed.
-- 2. admin_order_actions.action gains mark_complaint / clear_complaint so
--    each change is in the order's audit trail, like other admin actions.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS complaint_reported_at timestamptz;

ALTER TABLE public.admin_order_actions DROP CONSTRAINT IF EXISTS admin_order_actions_action_check;
ALTER TABLE public.admin_order_actions ADD CONSTRAINT admin_order_actions_action_check CHECK (action IN (
  'assign_rider','unassign_rider','reassign_rider','cancel','advance_status',
  'reissue_delivery_code','trip_failure_refund','mark_complaint','clear_complaint'));

COMMIT;
NOTIFY pgrst, 'reload schema';
