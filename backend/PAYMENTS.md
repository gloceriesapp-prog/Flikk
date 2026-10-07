# Customer payments — Cashfree (Razorpay removed)

Binding contract for backend, migration, customer app and admin. Razorpay is
removed completely (code, deps, env, column names). All payment state machines
(checkout attempts, reservation expiry, recovery, abandon → cancel/COD,
settle-after-cancel refunds, trip refunds, failed-delivery refunds) are KEPT;
only the provider changes. Verify every Cashfree request/response shape against
the official docs (https://www.cashfree.com/docs/api-reference/payments/latest)
before coding it — never guess field names.

## Provider basics

- API base: `https://api.cashfree.com/pg` (prod) / `https://sandbox.cashfree.com/pg`
  (`CASHFREE_ENV=production|sandbox`). Headers: `x-client-id`, `x-client-secret`,
  `x-api-version: 2025-01-01`, `x-request-id` (uuid), and `x-idempotency-key` on
  every POST that moves money (order create, pay, refund).
- Env (backend only): `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV`,
  `CASHFREE_WEBHOOK_SECRET` (= secret key unless docs say otherwise),
  optional `CASHFREE_VERIFICATION_CLIENT_ID` / `CASHFREE_VERIFICATION_SECRET`
  (Secure ID / verification suite, for UPI ID name lookup). Client apps hold NO
  Cashfree secret; customer app only gets `EXPO_PUBLIC_CASHFREE_ENV`.
- Amounts: Cashfree uses rupees with 2 decimals (not paise). Convert from our
  integer-paise math at the boundary only; compare amounts in paise.
- Our ids: Cashfree `order_id` = `gl_<checkout_session uuid without dashes>`
  (≤45 chars, unique per attempt). `order_tags` carry `gloceries_order_id` /
  `gloceries_trip_id` (replaces Razorpay notes). `order_expiry_time` = reservation
  expiry. `order_meta.notify_url` = `${PUBLIC_API_URL}/payments/webhook`.

## Flows

1. **Create**: `POST /payments/create-order` → creates Cashfree order → returns
   `{ provider: 'cashfree', providerOrderId, paymentSessionId, amount, environment }`.
2. **UPI app (intent)**: `POST /payments/upi/intent { orderId|tripId, app }` →
   backend calls Cashfree "Order Pay" with `payment_method.upi.channel = 'link'`
   → returns `{ providerOrderId, links: { default, gpay?, phonepe?, paytm?, bhim? } }`.
   Client opens the chosen app's link (iOS: app scheme; Android: link with the
   app package). Falls back to `default` / Cashfree checkout if the app can't open.
3. **UPI ID (collect)**: `POST /payments/upi/validate { vpa }` →
   `{ valid: boolean, name: string | null }` (format check always; name lookup via
   Cashfree verification API when configured; rate-limited per user). Then
   `POST /payments/upi/collect { orderId|tripId, vpa }` → Order Pay with
   `channel: 'collect'`; customer approves in their UPI app; client polls status.
4. **Card / netbanking / other**: Cashfree RN SDK (`react-native-cashfree-pg-sdk`)
   web/drop checkout with `paymentSessionId`.
5. **Verify**: `POST /payments/verify { orderId|tripId }` — server fetches
   `GET /orders/{order_id}` + `/payments` from Cashfree (never trusts client),
   settles via existing settlement RPC when a `SUCCESS` payment with matching
   amount exists.
6. **Webhook**: `POST /payments/webhook`, raw body; verify
   `base64(HMAC_SHA256(x-webhook-timestamp + rawBody, secret))` against
   `x-webhook-signature` with `timingSafeEqual`; reject timestamps older than
   5 min. Handle `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`,
   `PAYMENT_USER_DROPPED_WEBHOOK`, `REFUND_STATUS_WEBHOOK`. Idempotent by
   `cf_payment_id` / `refund_id`. Re-fetch from Cashfree before settling.
7. **Refunds** (cancel, settle-after-cancel, failed delivery, trip): existing
   refund job tables/workers; provider call becomes
   `POST /orders/{order_id}/refunds { refund_amount, refund_id, refund_note }`
   with our deterministic `refund_id` (`rf_<job uuid no dashes>`) as both
   refund_id and idempotency key; before creating, `GET /orders/{order_id}/refunds`
   and adopt an existing refund with that id. Status from refund webhook or poll.
8. **Abandon / recovery / expiry**: same rules as today; "is there a captured
   payment?" = Cashfree order payments with `payment_status = 'SUCCESS'`;
   `PENDING`/`NOT_ATTEMPTED` = still open; before cancelling/expiring, call
   `PATCH /orders/{order_id}` terminate (if supported) so a late payment can't land,
   and still handle a late SUCCESS via the existing settle-after-cancel refund path.

## Database (migration `103_cashfree_payments.sql`)

Rename (and recreate EVERY function whose body references the old names —
plpgsql bodies are not rewritten by RENAME):

| old | new |
|---|---|
| `orders.razorpay_payment_id` | `orders.provider_payment_id` |
| `orders.razorpay_refund_id` | `orders.provider_refund_id` |
| `trips.razorpay_order_id` | `trips.provider_order_id` |
| `trips.razorpay_payment_id` | `trips.provider_payment_id` |

Add `payment_provider text not null default 'cashfree' check in ('cashfree','razorpay')`
on `orders`, `trips`, `checkout_payment_sessions`; backfill `'razorpay'` for rows
that already have a provider payment id. Legacy Razorpay rows are never sent to
Cashfree: their refunds are flagged `manual_required` for admin. Function params
named `p_razorpay_*` become `p_provider_*` (none exist: every RPC signature is
unchanged, e.g. `settle_checkout_payment(p_order_id, p_trip_id, p_payment_id)`).

As built in 103:
- Refund status `manual_required` is valid on `orders.refund_status`,
  `order_refund_jobs.status` and `trip_refunds.status`. It is set for
  `payment_provider='razorpay'` orders/trips by the cancel trigger,
  `request_order_refund`, `retry_order_refund`, `enqueue_trip_refund`,
  `approve_failed_trip_refund` (trip legs get it too). Refund workers
  (`claim_order_refunds`/`claim_trip_refunds`) never claim it. Every refund
  open (queued/processing/failed) at deploy is flipped to it. Clients show it
  as "refund in progress".
- `mark_order_refund_manual(p_order uuid, p_reference text)` (service_role):
  requires `refund_status='manual_required'` and a 4–64 char reference; sets
  order + job `completed`, `provider_refund_id='manual:<ref>'`. For a trip leg
  it completes the trip refund and all its manual legs.
- A legacy checkout session (`checkout_payment_sessions.payment_provider =
  'razorpay'`) is not payable: `claim_checkout_payment` raises P0410, and
  `claim_checkout_expiry_reconciliation` skips it (the expiry batch's hard
  cutoff cancels it).
- Re-created functions keep their original `search_path` (`public` /
  `public, pg_temp`); only the new function uses `search_path=''`.

## API field names (clients)

Order/trip JSON exposes `providerPaymentId`/`provider_payment_id`,
`provider_refund_id`, `payment_provider` instead of any `razorpay_*` field.

## Backend as built (src/payments)

- Cashfree `order_id` = `gl_<order/trip uuid without dashes>` (deterministic per
  checkout target, not per session row). A lost create response is recovered by
  `GET /orders/{id}`; a duplicate create (409) adopts the existing order.
  `order_expiry_time` = max(placed_at + 20 min, now + 16 min); expiry
  reconciliation terminates the order when the reservation lapses first.
- `provider_payment_id` stores Cashfree `cf_payment_id` (as string).
- Env: `CASHFREE_CLIENT_ID`/`CASHFREE_CLIENT_SECRET` accepted as aliases for
  `CASHFREE_APP_ID`/`CASHFREE_SECRET_KEY`; optional `PUBLIC_API_URL` → `notify_url`.
- Responses:
  - `POST /payments/create-order` → `{ provider:'cashfree', providerOrderId, paymentSessionId, amount (rupees), environment }`
  - `POST /payments/upi/intent { orderId|tripId, app?, platform?:'android'|'ios' }` →
    `{ providerOrderId, providerPaymentId, app, link, links: { default, gpay?, phonepe?, paytm?, bhim?, web?, ... } }`.
    `app` ∈ default|gpay|phonepe|paytm|bhim|amazonpay|cred|whatsapp (unknown → 400 INVALID_UPI_APP);
    `link` = `links[app] ?? links.default`. A repeat call replays the stored links.
  - `POST /payments/upi/collect { orderId|tripId, vpa, platform? }` →
    `{ providerOrderId, providerPaymentId, vpa, expiresAt: string|null }` (10-min collect).
  - `POST /payments/upi/validate { vpa }` → `{ valid, name|null }`; limits 5/min per user,
    20/min per IP (429 UPI_VALIDATION_RATE_LIMITED + Retry-After). Lookup = Secure ID
    `POST /verification/upi/penny-drop` (billed per call); outage → format-only result.
  - `POST /payments/verify { orderId|tripId }` → `{ ok: boolean, state: 'paid'|'pending'|'unpaid' }`;
    409 PAYMENT_ORDER_EXPIRED when the checkout was cancelled/expired (refund path).
  - `POST /payments/recovery` record exposes `provider_payment_id`, `payment_provider`.
  - Live tracking (`/orders/:id/live`, `/trips/:id/live`) exposes `provider_payment_id`,
    `provider_refund_id`, `payment_provider`.
- Refunds: `refund_id` = `rf_<order_refund_jobs.request_key | trip_refunds.id, no dashes>`,
  also the idempotency key; existing refund with that id is adopted. Workers also
  guard legacy rows (`payment_provider='razorpay'` or a non-`gl_` session) → `manual_required`.
- Preference allow-list adds `upi_app:amazonpay`; `upi_id` is stored as-is (method only, never the VPA).
