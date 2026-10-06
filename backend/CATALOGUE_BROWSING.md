# Bounded catalogue browsing

## Customer flow

Grocery, Fruit & Veg and Regional use published admin selections. Each of up to five nearby shops returns only a union of collection previews via `GET /stores/:id/home-preview?tab=grocery|fresh|regional`. Each product/hero section selects at most its configured limit (1–24); shops select three, category/brand tiles select one image candidate. The shared validator limits the combined budget to 600 product candidates per shop; normal layouts request substantially fewer. Duplicate IDs are hydrated once. Automatic ingredient previews are balanced across literal terms; manual previews use configured order. Only approved, stocked products from that shop qualify.

`GET /stores/:id/collection-products?tab=...&section=...&item=...&limit=24&after=UUID` resolves enabled rules on the server. Selection IDs cannot bypass published rules. Pages use an indexed UUID cursor, with a 60-product ceiling and an extra ID to determine continuation. No offset or catalogue-wide application scan. Full store browsing uses `GET /stores/:id/products-page` with the same cursor contract. Both screens have an explicit load-more/retry control. This avoids automatically crawling many nonmatching pages. Existing client-side price/type/brand filters and sorting apply to products loaded so far; load additional pages to see more matches. Catalogue-wide sorting/facets require server-side filter/sort cursors, which this change does not implement.

Stock events reset full browse lists to one page before refetching; they do not replay every page visited. Preview queries retain store-specific realtime subscription keys. Configuration changes invalidate preview/browse reads. Closed shops are excluded from purchasable collection pages. Checkout independently validates delivery eligibility and availability.

Legacy `/stores/:id/products` retains its array shape but is bounded to 30 products by default, with an explicit limit up to 60. The legacy home inventory hook requests 48. Old app versions using this as a full catalogue must upgrade to the paged endpoint. Legacy regex-based collections and festival discovery remain limited previews.

## Database

Apply migration `072_bounded_collection_browse.sql` before deploying the new client/backend. It adds a partial `(store_id, id)` browse index and service-role-only SQL selectors. Product/variant/store hydration uses the existing projection in batches of 100 IDs to avoid oversized PostgREST URLs. Failed/missing RPCs return an error; there is no unbounded fallback. Literal text matching runs inside PostgreSQL, without executable client-supplied SQL or regex. Preview balancing can still scan a shop's eligible rows; benchmark query plans on production-size shops. Consider online index creation when deploying against a busy, large table.

## Read coalescing and limits

`shortCache` is mounted on public GET feeds. Canonical query-key ordering combines identical simultaneous requests into one route execution **per backend process**. Followers share JSON success or error responses; errors are never cached. Invalidations mark the current generation stale. A new request can start a fresh generation; waiting requests on the old generation receive retryable 503 rather than old stock. Leaders predating an event may complete; checkout does not use this cache to accept orders.

Bounds: 1,000 active leaders; 1,000 waiters per key; 4,000 waiters overall; a 15-second follower timeout. Disconnects release waiters. Capacity exhaustion returns `READ_BUSY`/503 with Retry-After instead of bypassing the cache. Entries are LRU bounded to 1,000 keys and approximately 32 MiB of serialized bodies; bodies over 1 MiB are not retained. JSON object/socket overhead is additional. TTLs are staggered within 80–100% of the configured duration.

Instances share database invalidation signals, not cached bodies or locks. N instances can still generate N cold leader reads for one URL. Redis is not configured in this repository; distributed coalescing is not claimed. Before scaling out widely, measure cold-read pressure and add shared caching with versioned store/config keys and invalidation generations if needed. Personalized checkout/order/auth data must not enter this public cache.

## Validation

Tests cover concurrent reads, canonical keys, error sharing, invalidation races, waiter bounds, collection gates, limits and hydration cursors. `tests/sql/bounded-catalogue.sql` only runs against the isolated local checkout fixture; it verifies balanced previews, pagination, availability/approval/store scoping and RPC permissions. Run the backend regression suite and both TypeScript checks. These tests do not establish 10k–50k-user capacity; realistic multi-instance load tests remain necessary.
