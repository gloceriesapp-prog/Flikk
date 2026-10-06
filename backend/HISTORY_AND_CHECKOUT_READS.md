# Checkout snapshot reuse and bounded history

## Checkout

`requireCheckoutEligibilitySnapshot` returns the owned delivery address and the product/variant catalogue checked for eligibility. `buildCheckoutSnapshot` passes that same request-local catalogue to `loadCheckoutItems`, which still runs schema readiness, variant pricing, pack normalization and the single-store guard. No cache is shared between a quote and its submission. A submission reads and validates a fresh catalogue; quote confirmation still compares prices/fees/address. Existing SQL transaction guards and stock locks/reservations remain authoritative at commit. Product reads select only pricing, stock, approval, pack and ownership fields.

## Customer purchase history

`GET /orders/history` returns `{ items, nextCursor }`, default 20 purchases, maximum 100. Supported filters: `q` (up to 100 characters), `status`, `from` inclusive and `until` exclusive. Cursors are bound to customer and filter scope. Scope fingerprints are not authorization or signatures: every SQL query independently filters by the authenticated customer. Tokens strictly validate UUID/date values before constructing PostgREST expressions.

The service-only `customer_purchase_page` SQL function pages standalone orders and trips first, with a timestamp/entity-ID/trip-kind tie-breaker. Trips use their real `created_at`; progress filtering derives the bottleneck from child order statuses rather than the coarse trip status. The API then hydrates all customer-owned legs for those selected purchases. A purchase is not split at a page boundary. List columns omit delivery OTPs, payment-provider IDs, addresses and other detail-only data; detail screens retain their existing endpoints.

The customer screen keeps search available when filters return no results, debounces search and provides load-more/retry. Foreground entry refreshes the first history page; additional pages are requested on demand. `GET /orders/history-status?ids=...` supplies only status/ETA/milestone/revision fields for up to 100 owned orders per request. Polling stops when loaded live orders become terminal or the screen leaves foreground. Revision comparison prevents old status responses overriding newer detail snapshots. Legacy `GET /orders` retains an array contract but is capped at 20 rows; new clients use the history endpoint.

## Operational reads

Partner orders and reviews; admin orders and payouts; rider assignments, earnings and payouts; partner payouts and settlement-order breakdowns now support cursor reads with `limit` (1–100) and `cursor`. `page=1` returns `{ items, nextCursor }`; legacy consumers still receive a bounded array plus `X-Next-Cursor` when another page exists. Owner/store/rider authorization is retained before pagination. Each sort has an ID tie-breaker. Other product/inventory endpoints and admin's independent Next.js reporting queries are not claimed as paginated by this change.

Partner/rider payout screens and settlement-order details expose load-more. Rider earnings transactions are scoped to the selected week and paginated; database daily aggregates provide whole-period chart and balance totals independent of loaded transaction pages. Settlement detail totals use the stored payout total, not a subtotal of loaded orders. Payout counts use one bounded `partner_payout_counts` RPC rather than one network count per payout. Payout-list filter badges describe loaded rows; they are not lifetime totals.

Partner working-queue sync pages open orders plus today's failures/completed deliveries; rider assignment sync pages open work plus today's rows. Clients follow bounded working-queue pages to avoid dropping active work while avoiding lifetime history on every poll. These polling feeds still transfer queue items; further optimization could split their static payloads from live status. An unresolved open-work backlog can still require multiple pages.

## Database and rollout

Apply `073_history_query_indexes.sql` before deploying these endpoints/apps. It creates customer/store/rider/status/time indexes, private purchase-selection and payout-count RPCs, plus an `earned_at` rider-earnings snapshot and private daily earnings aggregate. Historical earnings are backfilled from actual delivery timestamps, including the latest trip-leg delivery when necessary. Truly undated legacy records remain in the ledger; dated period queries cannot attribute them to a week. Review/repair such records operationally rather than inventing dates.

The migration performs index creation and a legacy earnings backfill. For a large live database, stage the backfill and use suitable online index creation in an operational deployment plan. This repository migration is validated against the isolated SQL fixture; applying it to the shared database is a separate deployment step. Previous migrations are prerequisites. Failure to find the RPC/columns returns an error rather than falling back to an unbounded query.

## Verification and limits

Tests cover same-request checkout reuse, quote-change handling, invalid limits/cursors, scope mismatches, timestamp ties, private purchase/leg reads, unavailable RPCs, live-status ownership, complete trip paging and whole-period earnings totals. Load tests with realistic histories and shop/rider workloads are required before claiming 10k–50k-user capacity. Literal history search still needs a production query-plan check for very old accounts; bounded output alone does not imply constant SQL work.
