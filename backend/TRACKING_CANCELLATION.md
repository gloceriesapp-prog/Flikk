# Tracking and customer multi-shop cancellation

## Tracking

The customer tracker distinguishes initial loading, a connection failure, a failed request, an unavailable order, and loaded information. Transient errors retain TanStack Query's last successful data and show a retry notice with its update time. Definitive 401/403/404/410 responses hide cached information. Empty trips never reach `representativeLeg`.

Polling runs every eight seconds while the screen is focused and the app is active. It stops when every order is terminal, unless a combined refund is queued or processing. Returning to the screen refreshes tracking. Database read failures return a service error rather than pretending the order does not exist.

## Cancellation contract

`POST /trips/:id/cancel` takes `{ reason }`. Customer ownership is checked within `cancel_customer_trip`. A 200 response contains `outcome: cancelled | blocked`, one `shops` entry per shop, and the combined `refund` summary. A blocked business outcome is distinct from an unconfirmed network outcome.

The transaction locks the trip, all orders by ID, and reserved products by ID. If any order is beyond placed/packed/cancelled, no remaining order is cancelled. Otherwise all eligible orders and the trip are cancelled together. Existing inventory triggers release reservations once. Repeated requests return the current outcome without another reservation release or refund job. Existing cancelled shop orders do not prevent cancelling eligible siblings. The old customer per-order endpoint refuses cancellation of a trip leg.

The tracker displays each shop's result, and one combined refund because the trip has one payment. After restart it reconstructs shop outcomes from persisted statuses and reads the durable refund summary. Payment recovery uses the same coordinated endpoint.

## Refund processing

Migration **065**, after **062–064**, adds a service-role-only `trip_refunds` queue and RPCs. No customer API role can invoke these RPCs directly. Cancellation commits before any provider call. The refund target is the trip's saved total, including fees and discount; gross shop subtotals are not summed. An unpaid checkout creates no refund job. A subsequently captured payment queues the same refund job through settlement.

Every 30 seconds, each backend instance claims at most ten due jobs using database leases and `SKIP LOCKED`. Provider calls have 15-second timeouts; unknown outcomes retry with bounded exponential backoff. The remaining refund amount accounts for existing pending and completed provider refunds, with paginated, deduplicated reads. A request amount is frozen before sending, and the job UUID supplies Razorpay's [refund idempotency header](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md). Retries reuse the same amount and key after a lost response. Completion requires the full combined target to be confirmed processed, rather than any one partial refund. Failed provider refunds and definitive request rejections remain `failed` for support review; do not change a frozen amount/key to force a retry. Queue updates are fenced by lease token across workers.

Existing partner/admin individual-shop refund handling remains separate; this change coordinates **customer whole-trip cancellation**. Earlier partial refunds are included in provider reconciliation. If an existing partial refund fails or requires manual action, review it before issuing additional money movements. The admin per-order retry rejects shared trip payments: review its `trip_refunds` record and provider refund history instead.

## Deployment and verification

Apply migration 065 before deploying this backend/customer version. Shared migrations were not applied during this work. Unit tests cover tracking states, provider remainder calculations, immutable retries and delayed capture. SQL tests in `tests/sql/trip-cancellation.sql` and `trip-cancellation-concurrency.py` target only the isolated `flikk_checkout_tests` database and check atomic cancellation, ownership, refund totals, inventory conservation and both pickup/cancellation race orders. No live payments are created by these tests. Native UI and real provider sandbox settlement still require end-to-end verification.
