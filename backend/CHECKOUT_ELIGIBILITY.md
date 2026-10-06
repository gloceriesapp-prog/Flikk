# Checkout eligibility and inventory

The server is authoritative. POST `/checkout/availability` returns a status for
every requested pack plus global eligibility issues. It reads all requested
products, their shops, the customer's own non-deleted saved address and active
zones in batches. Quotes and order creation also run those checks. Quotes now
include the owned address ID, zone and coordinates in their signed snapshot.
Changing the selected address or its saved pin requires a new quote.

Eligibility requires:
- Platform hours: 06:00 inclusive to 22:30 exclusive, Asia/Kolkata.
- Approved product, `is_in_stock`, and stock status not `out_of_stock`.
- A real selected pack, if a pack ID is supplied.
- Active shop with valid opening/closing hours. Both unset means the shop's
  manual active toggle governs it; malformed or partial schedules fail closed.
  Overnight hours are supported; equal start/end explicitly means 24 hours.
- Owned saved address with a valid finite pin, in an active delivery zone.
- Every shop in the address's zone and within its own delivery radius;
  unset radius uses the existing 12 km fallback. Missing shop pins fail closed.
- Enough counted stock for the sum of every variant of a product in the cart.

Migration 063 requires 062. Both are prepared but not applied to the configured
shared database. Checkout checks the schema marker and fails closed until
activation. Availability/card status can still be checked independently.
No historical orders are retroactively reserved or have their prices changed.
Order, settlement and expiry RPCs explicitly exclude anon/authenticated API
roles; only the backend service role may execute them. Reservation rows are
hidden behind RLS and API-role table grants are revoked.
Deploy both migrations before the matching backend/customer release.

## What is counted

The actual database has parent `products.stock_quantity`, not variant-level
counts. All packs share that parent inventory pool; one ordered pack consumes
one available unit. Per-pack physical stock/weight conversions are not invented.
For physically separate pack inventories, add explicit variant stock counts
before adopting that different model.

Some existing products have placeholder `0` counts alongside in-stock labels.
Migration 063 adds an explicit `stock_tracking_enabled` flag. It opts in positive
counts and zero/out-of-stock products, preserves legacy zero/in-stock products
as availability-only listings, and does not invent positive quantities for them.
The backend's existing product count editor opts in whenever a real count is
submitted, including zero. Every explicit out-of-stock flag blocks checkout
regardless of tracking. Tracked zero counts block checkout even if a stale label
says in stock. A tracking flag cannot be disabled while it has live reservations.
Count edits represent **available units**, excluding current reservations.

## Transaction rules

Order RPCs lock all parent products in ID order before inserting any order.
The order insert trigger locks and rechecks the owned address, shop and zone,
including opening hours, platform time and delivery radius. Item insertion
locks/rechecks product approval, stock and selected variant price/pack details.
Counted inventory is subtracted and a reservation is written in the same
transaction. If any line/shop fails, the entire single-shop order or multi-shop
trip rolls back. Two buyers of the last unit cannot both succeed.

- COD reservations commit at placement.
- Online reservations hold for 20 minutes, matching the existing payment timeout.
- Verified on-time payment commits the existing hold without subtracting again.
- Pickup consumes the reservation. Delivery failures after pickup do not restock
  goods automatically.
- Cancellation before pickup releases each live reservation exactly once.
- The expiry job now calls a database RPC: timeout, trip/leg cancellation and
  stock release are one transaction. It locks the same payment/order rows as
  settlement, so it cannot cancel an order that won the payment race.
- Unpaid online orders cannot become packed/out for delivery.
- Order state transitions are enforced again inside the database. Terminal orders cannot be resurrected. A capture after cancellation/expiry
  keeps the order cancelled, records the payment and starts the existing refund
  workflow for the full saved order/trip total. Failed refunds are persisted and
  return a retryable failure to the provider; admin refund follow-up remains
  available. Duplicate captures use the existing refund lookup/idempotency guard.

## Customer behavior

Availability refreshes on entering/resuming the cart, on cart/address edits and
every 15 seconds while that screen is active. It does not poll in the background.
Unavailable cart rows show `Out of stock`, shop/pack unavailability, delivery
restrictions or insufficient quantity, with a Remove action. Quantity increases
stop at the known available count; reductions/removal remain available. Low
counts display an `Only N left` label. Product cards and product-sheet Add
controls display an out-of-stock state for unavailable catalogue products.
Payment is disabled for unchecked, failed or ineligible carts. Place order still
fetches a fresh quote and the transaction does the final check, so cached UI
state cannot override a stock or eligibility change.

## Verification

`npm test` / `npx tsc --noEmit` in backend; customer TypeScript and focused lint.
SQL fixtures run only in isolated `flikk_checkout_tests`:

    psql -h <local-socket-directory> -p 55439 -d flikk_checkout_tests -X -v ON_ERROR_STOP=1 -f backend/tests/sql/checkout-eligibility.sql
    python3 backend/tests/sql/checkout-concurrency.py --host <local-socket-directory> --port 55439

The fixtures verify conservation, all-or-nothing trip rollback, reservation
commit/pickup, cancellation/expiry releases, late capture rejection and the
last-unit race, as well as the transactional store/address/product gates.
