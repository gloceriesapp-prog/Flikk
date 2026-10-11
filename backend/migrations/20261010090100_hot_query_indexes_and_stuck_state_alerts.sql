-- Issue #33: indexes for hot query shapes that are not already served.
--
-- The orders/products/reviews/rider_earnings/notifications/payouts tables are
-- already heavily indexed (see pg_indexes). Most shapes in the original issue
-- list are already covered by an equal or superset index, so adding them would
-- only amplify writes on hot tables. These are the two genuinely-missing ones:
--
--  * orders(rider_id, status): a rider's lifetime delivered-order COUNT
--    (routes/orders.ts, routes/trips.ts: .eq('rider_id',X).eq('status',
--    'delivered')). orders_rider_id_idx (rider_id only) and
--    orders_rider_history_idx (rider_id, placed_at DESC, id DESC) both force a
--    scan+filter of every one of the rider's orders; this makes it an
--    index-only count.
--  * orders(customer_id, placed_at DESC, id DESC): GET /orders customer order
--    history (routes/orders.ts) is unfiltered by trip_id or status, so the
--    partial orders_customer_solo_history_idx (WHERE trip_id IS NULL) and
--    orders_delivered_repeat_cursor_idx (WHERE status='delivered') cannot
--    serve it — the planner falls back to orders_customer_id_idx + a sort.
--
-- Skipped as already covered (existing index in parens):
--   orders(store_id, placed_at)                 -> orders_store_history_idx (prefix)
--   orders(store_id, status, delivered_at)      -> orders_payout_breakdown_idx / orders_delivered_settlement_idx
--   orders(trip_id, status)                     -> orders_trip_id_idx (legs per trip are few)
--   products(store_id, approval_status, stock_status) -> products_browse_* partials; partner list filters store_id only
--   reviews(store_id, created_at)               -> reviews_store_history_idx (prefix)
--   reviews(customer_id, order_id)              -> reviews_order_id_key (unique) + reviews_customer_id_idx
--   rider_earnings(rider_id, earned_at, trip_id)-> rider_earnings_history_idx (prefix)
--   notifications(user_id, created_at)          -> notifications_user_created_idx (exact)
--   payouts(store_id, week_start)               -> payouts_store_week_unique (exact)
--
-- CREATE INDEX (not CONCURRENTLY) because migrations run in a transaction.

CREATE INDEX IF NOT EXISTS orders_rider_status_idx ON public.orders (rider_id, status);
CREATE INDEX IF NOT EXISTS orders_customer_history_idx ON public.orders (customer_id, placed_at DESC, id DESC);

-- Issue #26: periodic stuck money/dispatch detection (jobs/stuckStateAlerts.ts).
-- Durable schedule row so the worker's claim_scheduled_work picks it up on an
-- interval and runs it on exactly one replica. ON CONFLICT keeps re-runs safe.
INSERT INTO public.scheduled_work(name, interval_seconds, catch_up, next_run_at) VALUES
 ('stuckStateAlerts', 60, false, now())
ON CONFLICT(name) DO NOTHING;
