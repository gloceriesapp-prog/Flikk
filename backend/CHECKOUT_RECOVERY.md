# Checkout attempts and payment recovery

## Release order

Apply migrations 062, 063 and **064_checkout_attempts_payment_recovery.sql** before deploying this backend/customer release. Migration 064 is prepared, not applied to the configured database. Older clients without `attempt_id` receive `ATTEMPT_REQUIRED`; deploy with an enforced minimum app version or a coordinated rollout. Do not silently generate a server attempt ID for old requests: it defeats retry protection.

## Duplicate-order prevention

The customer saves a server-generated UUID and the request body in account-scoped AsyncStorage **before** sending order/trip creation. The key survives process termination. Local storage holds no payment credentials; backend authentication enforces ownership.

Identity binds product/variant quantities, address, payment method, coupon, store and checkout type. Quote signatures/expiry are excluded so committed attempts can replay after catalog changes. A repeated key with different semantics returns 409.

`create_checkout_attempt` inserts and locks a unique `(customer_id, attempt_id)` row, calls the existing transactional order/trip RPC and stores the result in the same transaction. Failed transactions roll back both attempt and order. Concurrent replicas return one committed result and reserve stock once. Replays skip store notifications. Stored results are placement snapshots; tracking/payment recovery always reads current backend status.

Closing an uncertain attempt uses the same uniqueness/row lock. It either returns the already committed result or records a tombstone fencing future creation. Never clear local attempt storage simply because a response was lost. Do not expire/delete server attempt records without a documented maximum retry window and a retained deduplication fence.

## Payments

One provider order is associated with each single-store order or combined trip. `claim_checkout_payment` validates customer, online method, status and the 20-minute payment window under a row lock. It permits only one provider-order creator and one UPI-intent creator across replicas.

Provider order receipts equal local checkout IDs. A creation timeout or crash keeps its durable claim: recovery looks up the receipt rather than issuing another provider create. Unknown outcomes fail closed. Operators must investigate stuck claims if the provider never accepted the request; the system intentionally does not steal an uncertain claim automatically.

Before launching another payment, fetch payments on the same provider order. Captured payments are settled through the existing transactional inventory/payment RPC. Created/authorized payments block another launch. Failed attempts do not cancel the order, since a different attempt on the same provider order may still succeed. Reservation expiry and explicit cancellation own checkout cancellation.

SDK verification and capture webhooks verify provider order receipt, captured state, INR amount and local/session identity. Delayed payment after cancellation/expiry uses the existing refund path; it never resurrects released inventory. No fallback from an uncertain UPI call into another payment path.

`POST /payments/recovery` returns a current backend record and state. A database lease coalesces status reconciliation to one provider query per checkout per 10 seconds across replicas/devices. Retry launches still check the provider afresh. Provider outages remain unknown, not “failed”.

App startup/foreground discovers both saved attempts and unexpired unpaid backend orders, including orders from another device. Recovery screens require target IDs only and fetch amounts/status from the backend. An unresolved create response can replay the saved request or atomically close its attempt. Payment timeout opens recovery instead of reporting an unconfirmed payment as failed. A recovered paid order clears only the matching saved cart, preserving a newer cart.

## Scale and operations

Attempt/session uniqueness and locks work across replicas; no process-local deduplication map. Pending discovery uses a partial customer/time index and bounded result sizes. This is correctness and bounded provider-polling work, not a 10k–50k-user capacity certification.

Monitor ambiguous provider claims, reconciliation failures, refund failures, reservation-expiry backlog, duplicate-key conflicts and latency. Provider API credentials, automatic capture and webhook subscriptions must be configured in staging/live. Native SDK/UPI process-kill flows require device testing; no live payment was made during implementation.

## Verification

Run backend tests and customer/backend typechecks. `tests/sql/checkout-attempts.sql` applies migration 064 only to the isolated `flikk_checkout_tests` fixture initialized by `checkout-eligibility.sql`. The concurrency script uses two real PostgreSQL sessions to prove single creation and close-vs-create fencing.
