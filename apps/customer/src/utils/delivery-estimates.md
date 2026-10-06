# Delivery estimates

Admin → Settings → Delivery & fees owns `estimatedDeliveryMinutes`, a whole number from 1 to 240. Migration `backend/migrations/061_delivery_estimate.sql` adds it to the existing singleton delivery settings row, defaulting to 35 minutes. Apply this migration before enabling admin edits.

The customer app shares the `delivery-settings` React Query cache across the home header, product cards, store cards and cart. RootNavigator subscribes once to the shared home-content event stream. Database settings updates invalidate backend and customer caches; a single foreground jittered 45–75-second refresh covers disconnected realtime streams. Product cards create no polling timers.

PostgreSQL records the configured minutes and absolute deadline when an order is inserted. A trip records one deadline and every child order inherits it, even if shops have different preparation times. Incoming client values are overwritten, and later updates cannot change the recorded estimate. Receipts, purchase history, tracking and order summaries use this snapshot. Admin edits affect browsing and future orders, without resetting orders already placed.

The deadline starts at placement, including time spent packing. Purchase cards say “Packing your order” until dispatch, then show the remaining minutes. Countdown values use the absolute deadline and stop at zero; reopening the app cannot restart the timer. Delivered orders show their actual delivery time.

Historical orders with no snapshot retain a fixed 35-minute fallback from their original placement timestamp; their original promise cannot be recovered. A failed initial settings fetch also uses 35 minutes until settings load. Existing endpoints and order RPC signatures are unchanged.
