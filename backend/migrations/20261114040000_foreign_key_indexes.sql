-- Index every foreign key that had none (Supabase advisor 0001), so deleting
-- or re-pointing a parent row (customer, store, order, trip) no longer scans
-- the child table. Additive only; tables are small, so plain CREATE INDEX.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE INDEX IF NOT EXISTS admin_push_messages_customer_id_fk_idx ON public.admin_push_messages (customer_id);
CREATE INDEX IF NOT EXISTS checkout_payment_sessions_customer_id_fk_idx ON public.checkout_payment_sessions (customer_id);
CREATE INDEX IF NOT EXISTS customer_deletion_requests_reviewer_id_fk_idx ON public.customer_deletion_requests (reviewer_id);
CREATE INDEX IF NOT EXISTS customer_notifications_area_upvote_id_fk_idx ON public.customer_notifications (area_upvote_id);
CREATE INDEX IF NOT EXISTS customer_push_receipts_customer_id_fk_idx ON public.customer_push_receipts (customer_id);
CREATE INDEX IF NOT EXISTS customer_push_receipts_notification_id_fk_idx ON public.customer_push_receipts (notification_id);
CREATE INDEX IF NOT EXISTS delivery_code_resets_actor_id_fk_idx ON public.delivery_code_resets (actor_id);
CREATE INDEX IF NOT EXISTS delivery_code_resets_order_id_fk_idx ON public.delivery_code_resets (order_id);
CREATE INDEX IF NOT EXISTS delivery_codes_customer_id_fk_idx ON public.delivery_codes (customer_id);
CREATE INDEX IF NOT EXISTS home_content_updated_by_fk_idx ON public.home_content (updated_by);
CREATE INDEX IF NOT EXISTS home_content_history_changed_by_fk_idx ON public.home_content_history (changed_by);
CREATE INDEX IF NOT EXISTS home_tabs_quick_category_id_fk_idx ON public.home_tabs (quick_category_id);
CREATE INDEX IF NOT EXISTS home_tabs_quick_subcategory_id_fk_idx ON public.home_tabs (quick_subcategory_id);
CREATE INDEX IF NOT EXISTS home_tabs_section_id_fk_idx ON public.home_tabs (section_id);
CREATE INDEX IF NOT EXISTS inventory_reservations_product_id_fk_idx ON public.inventory_reservations (product_id);
CREATE INDEX IF NOT EXISTS inventory_reservations_variant_id_fk_idx ON public.inventory_reservations (variant_id);
CREATE INDEX IF NOT EXISTS merchant_order_push_outbox_store_id_fk_idx ON public.merchant_order_push_outbox (store_id);
CREATE INDEX IF NOT EXISTS merchant_order_push_outbox_user_id_fk_idx ON public.merchant_order_push_outbox (user_id);
CREATE INDEX IF NOT EXISTS notifications_order_id_fk_idx ON public.notifications (order_id);
CREATE INDEX IF NOT EXISTS order_items_option_id_fk_idx ON public.order_items (option_id);
CREATE INDEX IF NOT EXISTS promotional_deliveries_customer_id_fk_idx ON public.promotional_deliveries (customer_id);
CREATE INDEX IF NOT EXISTS rider_earnings_rider_payout_id_fk_idx ON public.rider_earnings (rider_payout_id);
CREATE INDEX IF NOT EXISTS rider_profile_change_requests_reviewed_by_fk_idx ON public.rider_profile_change_requests (reviewed_by);
CREATE INDEX IF NOT EXISTS riders_zone_id_fk_idx ON public.riders (zone_id);
-- service_areas exists in production but no migration creates it, so a fresh
-- database (CI) has no such table.
DO $$ BEGIN
  IF to_regclass('public.service_areas') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS service_areas_zone_id_fk_idx ON public.service_areas (zone_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS store_memberships_created_by_fk_idx ON public.store_memberships (created_by);
CREATE INDEX IF NOT EXISTS support_ticket_requests_ticket_id_fk_idx ON public.support_ticket_requests (ticket_id);
CREATE INDEX IF NOT EXISTS support_tickets_order_id_fk_idx ON public.support_tickets (order_id);
CREATE INDEX IF NOT EXISTS support_tickets_trip_id_fk_idx ON public.support_tickets (trip_id);
CREATE INDEX IF NOT EXISTS trips_cancel_origin_order_id_fk_idx ON public.trips (cancel_origin_order_id);
CREATE INDEX IF NOT EXISTS trips_cancel_origin_store_id_fk_idx ON public.trips (cancel_origin_store_id);
COMMIT;
