# Customer experience hardening

## Deployment

Apply migrations 082–087 in numeric order before deploying the new backend/admin/customer code. These migrations have been exercised against disposable PostgreSQL 17 fixtures; this change does not apply them to the live database.

- 082: shared hashed authentication budgets, atomic account-owned address operations and a unique active default address.
- 083: checkout-transaction promotion validation/release and immutable product name/image snapshots for new receipt lines.
- 084: address-scoped, ranked search, bounded keyset catalogue pages and assortment-wide category facets.
- 085: leased push receipt reconciliation and admin-reviewed deletion requests.
- 086: counted actual pack stock, transactional reservation/release, delivery-based popularity and failed-trip recovery.
- 087: immutable delivery address, recipient contact and map pin snapshots for new orders and trips.

Configure `TRUST_PROXY_HOPS` to the actual trusted reverse-proxy hop count. Never trust arbitrary forwarded client IPs. `AUTH_BUDGET_SECRET` must be stable across replicas (otherwise the service-role secret is the fallback). The worker must run to reconcile push receipts and prune expired throttle buckets.

The Available Packs admin page sets **available retail-pack counts**, not grams or warehouse totals. Counts must exclude already reserved units. Multi-pack products require counts for each actual pack. Unconfirmed inventory is blocked at checkout. The database rechecks stock while holding the product row lock.

## Account deletion

Customers request deletion in Profile → Account & privacy. Repeated submissions return the existing open request. Admin → Account Deletions provides a paginated review queue and requires a review note. Approval is blocked by active orders, unresolved paid failed/cancelled-order refunds or open support tickets.

Approval is durable before Supabase Auth soft deletion. Cleanup requires a disabled auth identity, removes reusable profile details, push registrations, wishlist and unused address-book information, and marks completion. Orders, payments, refund/support history and order-linked addresses remain available for fulfilment/accounting. An interrupted approval can be retried without creating another request or removing the identity twice. An approved deletion cannot subsequently be rejected.

Saved carts are scoped to their customer. Startup waits for authentication before cart hydration; late responses from another session are discarded. Unowned legacy cart drafts are discarded. Local writes are serialized so logout clearing wins over preceding writes. Cart drafts remain device-local; multi-device cart merging is not implemented.

## Validation

Backend Vitest includes deletion API authorization, interrupted auth removal/cleanup, account-scoped caches and delayed saved-cart hydration. `tests/sql/customer-experience.sql` runs after the checkout/security/order-safety fixtures and checks migration compilation, deletion permissions/idempotency, atomic default addresses, shared rate limits, product receipt snapshots, scoped search synonyms, pack reservation/release and stale push receipts. CI runs this fixture in both legacy OTP schema variants.

## Remaining release work and policy dependencies

- Minimum-order and tax rules are awaiting the owner's policy. Preserve the existing zero minimum and add no invented tax charges.
- Historical receipt name/image snapshots cannot be reconstructed reliably; old orders retain the existing catalogue fallback. New orders record immutable values.
- Perform real iOS/Android two-account, offline restart, notification cold-start and payment interruption/reconciliation tests using development/release builds and the actual payment provider. Automated tests do not certify native provider behavior.
- Confirm support response/escalation staffing and SLA; no response-time promise is fabricated.
- Device-native crash collection needs an operational monitoring provider/configuration; structured backend metrics alone do not supply native crash reports.
- Profile payment-preference/about/appearance flows and cross-device draft synchronization need further product work; they are not declared complete by this hardening pass.

Do not interpret passing local tests as a verified 10k–50k capacity result. Use the existing sustained workload and database/worker capacity measurements to size deployment replicas.
