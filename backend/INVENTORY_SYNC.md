# Customer inventory synchronization

## Deploy

Apply `migrations/068_scoped_inventory_sync.sql` in Supabase, then deploy backend and customer app together. This migration is additive. Old app versions continue their existing polling until upgraded. This task tested the migration against a disposable local PostgreSQL fixture; it has not applied it to the shared Supabase database.

Missing migration keeps the new stream explicitly unhealthy and the app on fallback, rather than silently claiming inventory is live. Supabase must have Realtime running and service-role postgres_changes access to inventory_signals. The public stream exposes routing IDs only, never inventory rows or customer records. Signal rows have RLS enabled with no customer policies.

## Routing

Database triggers capture product, variant and store INSERT/UPDATE/DELETE inside the same transaction. Signals coalesce per store within each transaction, avoiding a shared store-row lock between concurrent orders. An indexed cleanup function removes signals older than five minutes in batches of 5,000 using SKIP LOCKED. Each backend process runs at most three batches every ten seconds; workers can safely share cleanup. Monitor retention lag and table size under load. Product moves signal both stores; store moves signal both zones; deletion keeps a routing tombstone. Variant cascade deletion is covered by the parent product signal. Rollback rolls back signals too. No per-customer database subscription or lookup is created.

Every backend process owns one database channel, including processes serving only HTTP reads. Store/zone reverse indexes route events to relevant streams. Stock changes go to store subscribers only. Zones are used for store discovery, including a previously empty nearby-store list. A 250ms store-level buffer coalesces bursts; an accumulated store-change flag preserves discovery updates if a product update follows. Slow clients with backed-up writes are disconnected.

HTTP cache invalidation retains unrelated store catalogs and category metadata. Cross-store product feeds are evicted because they can gain a newly available product. In-flight cache entries are invalidated by path; stock churn no longer suppresses unrelated settings/content cache fills.

## Customer policy

One foreground SSE connection unions active inventory query scopes (up to 100 stores/10 zones). Interests change through debounced reconnects. If interest count exceeds the bounded stream scope, the connection is treated as incomplete and fallback continues for the uncovered queries. Store-detail, nearby inventory, search, category and Home product queries share the same coordinator. Inventory invalidates matching caches, with React Query refetching active observers; a newly available product can repopulate an empty cross-store shelf. Order/profile caches are excluded.

Backend health frames every 20 seconds report the database connection, not just whether HTTP is open. Healthy realtime has no recurring fallback. Unhealthy streams refresh active browsing queries every randomized 45–75 seconds. Network reconnect uses exponential jitter capped at 60 seconds; a missing heartbeat is detected at 60 seconds. Recovery catches up once after 1–5 seconds of jitter. Background/unmount cancels connection, refresh and reconnect timers. Authoritative API refetches avoid stale or out-of-order stock patches.

Recovery also marks inactive catalogue previews stale without fetching them. This covers admin photo changes missed while the app was backgrounded or a tab was unopened. Paged caches are trimmed to their first page; invalidated store and collection screens refresh that page when reopened. Similar-product queries participate in store-scoped invalidation, and scope extraction traverses infinite-query pages. Private order/receipt snapshots remain unchanged. R2 uploads use a new object URL, so refreshed catalogue data selects the new image without clearing the device's entire image cache.

## Verify and capacity

Run backend Vitest `src/home-sync` and `src/middleware/shortCache.test.ts`, customer/backend TypeScript checks, and `tests/sql/scoped-inventory-sync.sql` on a disposable fixture after migration 068. SQL fixtures test variant price/delete, product moves, store moves and deletion, transaction rollback, and expiry cleanup. `tests/sql/scoped-inventory-concurrency.py` proves two transactions can signal the same store without blocking each other (verified locally: second completed in 29ms while first held its signal for two seconds). Native-device tests should exercise Wi-Fi loss, background/resume and two stores in different zones against deployed Supabase.

These fixes reduce unnecessary traffic; they do not establish 10k–50k-user capacity. Load-test SSE connection count, file descriptors, RSS, fan-out latency, cache hit rate, reconnect storms and Supabase replication lag. Configure load-balancer streaming and idle timeouts above heartbeat intervals. Each horizontal instance maintains its own scoped indexes and channel, so sticky sessions are not required. If database channel count becomes material under measured load, use a shared change consumer/broker; do not replace scoped routing with global broadcasts.
