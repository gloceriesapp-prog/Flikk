# Partner order reliability

Apply `20261014163158_partner_order_acceptance.sql` and
`20261014163241_merchant_order_push_outbox.sql` before deploying the API,
worker, or new partner app. Run the worker as its own service with the same
Supabase environment as the API. Production was not migrated by this task.

## Order lifecycle

An actionable merchant order is COD or has a verified provider payment ID,
and is not marked `checkout_payment_rejected`. Queue/detail endpoints enforce
store ownership; independent detail reads work without an already-loaded queue.

When an order becomes visible, the database snapshots `store_visible_at` and
`acceptance_deadline_at`. `POST /partner/orders/:id/accept` checks the caller's
active store access, payment, status and deadline transactionally, records
`accepted_at`, and returns the same acceptance on retry. It does not pack or
dispatch the order. The response deadline is no longer relevant after acceptance.

`preparation_deadline_at` is recorded separately using the store's configured
preparation time. An unset preparation time leaves that deadline null. There
is no new automatic preparation cancellation policy. Mark packed remains a
separate server transition. Legacy clients marking packed directly must meet
payment and response-deadline checks and atomically record acceptance.

The backend unanswered-order worker skips accepted orders. The partner timer
only shows reminders and refreshes at the deadline; phone clocks never authorize
cancellation. Failed accept/reject requests retain the decision UI for retry.

## Notifications

A database trigger creates private, unique `(order_id,user_id)` outbox records
in the transaction that exposes the order to the merchant. Worker replicas claim
bounded disjoint batches with leases, retry transient failures, persist Expo
tickets, and check delivery receipts. Known tickets are never resent. Invalid
device tokens are cleared conditionally, preserving a newly rotated token.
Accepted, expired, cancelled or inaccessible orders are skipped before sending.

Expo does not offer an idempotency key. A crash after Expo accepts a request but
before its ticket is stored can duplicate an OS alert. This is at-least-once
submission, not exactly-once device delivery. A stable notification event ID
allows app tap deduplication. Provider receipt confirmation does not prove a
merchant saw an alert; keep the foreground queue and notification-permission UI.
The old checkout notification callback no longer sends directly.

## Device and account state

A session generation changes on logout/sign-in, not token refresh. Private
query keys include the generation/store. Logout clears query caches and orders,
catalogue, profile, reminder, earned-alert and notification state. Reads,
mutations, token refresh and notification tap callbacks discard old generations.
Order reads are coalesced; a mutation invalidates older queue responses.

Store open/closed updates serialize, use server responses, surface failure and
restore/reconcile state. Prices and MRP use validated decimal rupees preserving
paise, with focused text buffers for partial input. Final onboarding submission
includes validated coordinates rather than relying on draft autosave.

## Verification and release

- `npm test -- --maxWorkers=2 --minWorkers=1` from backend.
- `npm run test:partner:db` from backend: local-only rollback assertions against
  seeded local Supabase. It refuses non-local hosts and never reads DATABASE_URL.
- `npm run typecheck` and `npm run lint` from apps/partner.
- Production Android JavaScript export verifies screen/import bundling.
- Physical tests still required: COD and captured online order receipt, pending
  online invisibility, multi-shop acceptance, accepted order past its old response
  deadline, accept/reject failures, cold-start push, notification permissions,
  two-account switching during requests, decimal edits and failed store toggle.

Deploy database first, then API and worker, then partner binary/update. Verify the
worker monitoring/queue health and pending/failed outbox counts. Do not start a
live notification worker as an automated unit-test shortcut.

## Partner read scaling and management follow-up

- Inventory reads are cursor paginated (30 on mobile and dashboard, maximum 100), explicitly projected and searched/filter scoped on the server. Only in-flight identical reads are shared; there is no cross-account private response cache.
- Mobile inventory refreshes observe a 60-second freshness window and capped failure backoff. A refresh failure retains the last successful items and exposes retry/freshness. Load-more is explicit; summary counts describe loaded items.
- Approved product image changes still use the existing review gate. Images upload to public R2; product records hold the returned URL. Store photo upload and profile save must both succeed before reporting success.
- Historical/problem orders use their own cursor-paginated search rather than enlarging the operational queue. Purchase details prefer immutable order-item snapshots; legacy rows without snapshots use their existing fallback.
- Reviews/replies use the existing scoped endpoints. Owners can inspect and revoke manager access; adding a manager remains an admin-approved support workflow, avoiding arbitrary promotion of customer accounts.
- Approved legal-number replacements stay pending through the existing admin store-change workflow. Private identity-document photo replacements remain support-managed; identity documents must never use the public R2 image endpoint.

Deployment requires the new management and inventory-index migrations before the new management routes are used. Database verification must target the local loopback database explicitly; do not inherit a production DATABASE_URL from `.env.local`. Unit tests do not establish a supported concurrent-user capacity or replace physical-device and load testing.

The operational order poll checks a lightweight digest every ~12 seconds with jitter while foregrounded, backs off to at most two minutes on failure, and performs a bounded full refresh on changes or at a two-minute safety interval. Queue pages are at most 100 orders and never automatically drained. Tracked orders leaving a page are checked in one bounded, store-scoped transition read so verified delivery earnings can still be announced. Delivery/problem tabs open paginated history. This is polling with bounded reconciliation, not a realtime transport or a verified capacity guarantee.

## Store pin confirmation

The map confirmation action uses a solid, keyboard-safe button and waits for the owner-scoped save before closing. Save failures retain the selected point for retry. Area lookup is bounded to eight seconds and never fabricates a district. A session generation check prevents an old map lookup from writing into a newly signed-in account.

Approved pickup coordinates remain authoritative during admin review. Settings display the proposed address as pending; reopening the editor seeds the proposed pin. Reviewed fields do not optimistically overwrite the live profile.

Run `npm --prefix backend run test:partner:customer-order:db` against local Supabase for the rollback-only customer-to-store transaction test. It verifies COD visibility, item snapshots, inventory reservation, checkout replay, unpaid-online exclusion, captured-amount validation, paid-online visibility, notification intent and merchant acceptance/packing. It performs no external payment or notification call. The actual store still needs approved stock and both apps must use the same backend environment; local debug orders cannot appear in a production partner session or vice versa.
