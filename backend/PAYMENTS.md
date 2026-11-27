# Razorpay payments

New customer payments use Razorpay Orders and native React Native Checkout.
The apps never receive the API secret or webhook secret. Cash on delivery,
quotes, multi-shop orders, order status, rider earnings and merchant accounting
continue to use the existing commerce backend.

## Module boundaries

- `src/payments/razorpayClient.ts`: bounded server REST calls and HMAC checks.
- `src/payments/recovery.ts`: ownership, durable checkout sessions, provider
  order creation/recovery and server-side payment reconciliation.
- `src/payments/verifyPayment.ts`: optional signed SDK result followed by a
  provider read; a client callback alone never marks an order paid.
- `src/payments/webhook.ts`: original-body HMAC verification and reconciliation.
- `src/payments/refundPayment.ts`, `orderRefunds.ts`, `tripRefunds.ts`: durable,
  idempotent refunds and safe recovery after process failures.
- `migrations/20261013105118_razorpay_provider_checkout.sql`: append-only
  provider cutover, service-only claims and settlement/refund safeguards.

## Payment flow

1. Backend validates the quote, eligibility, stock and checkout attempt and
   reserves inventory transactionally. All payment amounts come from this bill.
2. `POST /payments/create-order` accepts an owned order/trip target, claims its
   payment session and creates one Razorpay order in INR/paise. Concurrent
   retries reuse the stored order. If the create response was lost, recover by
   deterministic receipt; never blindly create another provider order.
3. App opens Razorpay's native Checkout with the public `keyId`, the exact
   `providerOrderId` and server `amountPaise`. Razorpay handles UPI app intent,
   netbanking, cards and other account-enabled payment methods.
4. SDK success sends order ID, payment ID and signature to `/payments/verify`.
   The backend checks the signature against its stored order ID, re-reads the
   provider payment and requires captured status, the same order, amount and
   currency. An authorised payment is not treated as captured.
5. Transactional settlement commits payment/order state once. Verified repeated
   SDK callbacks, webhooks and recovery reads are idempotent.
6. A killed/backgrounded app restores its persisted checkout and asks the
   backend for status. Countdown uses an absolute reservation deadline, not a
   timer paused by switching to a UPI app. A failed/cancelled SDK interaction
   still reconciles the backend before another attempt or COD conversion.
7. Razorpay orders cannot be terminated like the previous provider. Reservation
   expiry is local. A later captured payment must be recognised and refunded
   through durable refund intent; it must not resurrect released stock or COD.

The previous `/payments/upi/intent` and `/payments/upi/collect` server charge
paths are unavailable. Do not manufacture `upi://pay` URLs, substitute app
schemes, or assume S2S enablement changes native Standard Checkout APIs. Exact
UPI app choice is made in Razorpay's secure native UI. Account enablement is
necessary but is not evidence of a successful device integration.

## Required private configuration

Set the same account credentials on **both Railway Flikk API and worker**:

```dotenv
RAZORPAY_KEY_ID=                 # rzp_test_... or rzp_live_...
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=         # separate secret, configured on the webhook
RAZORPAY_ENV=test                # test | live, must match key prefix
CASHFREE_APP_ID=                 # optional second gateway, see "Cashfree"
CASHFREE_SECRET_KEY=
CASHFREE_ENV=sandbox             # sandbox | production, must match App ID
```

Missing credentials disable new online checkout. COD can remain available.
`ONLINE_PAYMENTS_DISABLED=true` and the admin checkout switch independently
block new online attempts; reconciliation of already-started payments must
continue when keys are configured. Do not place secrets in `EXPO_PUBLIC_*`,
admin browser variables, logs, source control or tickets.

Configure automatic capture in Razorpay and an HTTPS webhook:
`POST https://<api-domain>/payments/webhook`. Subscribe to the event names
handled by `webhook.ts`, including payment captured/failed, order paid and
refund status events. Verify the signature with the webhook secret over the
unmodified raw request body. Razorpay does not use the previous provider's
base64 signature/timestamp headers. Provider retries and out-of-order events
must be safe; events alone cannot override a contradictory provider payment.

## Cashfree (second gateway)

Cashfree runs beside Razorpay with the same business rules; only the provider
adapter differs. Modules: `cashfreeClient.ts` (REST, API version
`2025-01-01`), `cashfreeCheckout.ts` (create/recover/reconcile),
`cashfreeWebhook.ts`, `gateway.ts` (selection + fallback), `provider.ts`
(the shared provider contract). Migration `20261128090000_cashfree_gateway.sql`
widens the SQL money functions to both providers.

- **Selection.** Admin setting `platform_settings.payment_gateway`:
  `razorpay` (default) | `cashfree` | `split` with `payment_gateway_split_pct`.
  Split uses a stable hash of the checkout id. Only app builds that send
  `provider:'auto', supports:['razorpay','cashfree']` can get Cashfree; old
  builds (`provider:'razorpay'`) always get Razorpay. The first claim fixes a
  checkout's provider.
- **Order creation.** From persisted data only: amount (INR), our order id
  `gl_<checkout hex>` (also the Razorpay receipt), customer phone, email only
  when the customer saved a real one. The app receives only
  `paymentSessionId`. A duplicate create (409) adopts the existing order.
- **Fallback.** If Cashfree order creation fails (provider error or missing
  phone), `switch_checkout_provider` moves the checkout to Razorpay once.
  It refuses after a provider order is attached or after one fallback, and
  the app never held a Cashfree session for it, so nothing can be charged twice.
- **Verification.** Paid only after a server read: order `gl_...` with our tag
  and amount, a `SUCCESS` payment with the same order, INR and exact paise,
  then `settle_checkout_payment(..., 'cashfree')`. Webhooks
  (`POST /payments/cashfree/webhook`) are verified as
  base64(HMAC-SHA256(x-webhook-timestamp + raw body, CASHFREE_SECRET_KEY)),
  with a 5-minute replay window, and only trigger that same read. Duplicates and
  late events are idempotent in SQL.
- **Recovery / expiry / cancel** use the same entry points
  (`recoverProviderOrder`, `reconcileProvider`), which dispatch by the
  session's provider.
- **Refunds** always go to the provider that took the payment
  (`refundSource`): Cashfree refunds use `POST /orders/{id}/refunds` with a
  deterministic alphanumeric `refund_id`; Razorpay payments always refund via
  Razorpay. Statuses: SUCCESS = completed; CANCELLED/REJECTED = failed; others
  are still processing.
- **Fees.** Cashfree's payment read does not return fees; they appear in
  settlement reports (and the optional `PAYMENT_CHARGES_WEBHOOK`). Not stored.
- **Payouts** are unchanged (manual; Easy Split is a later task).

Dashboard webhook: `https://<api-domain>/payments/cashfree/webhook`, version
2025-01-01, events payment success / failed / user dropped, refund status
(auto refund optional). Removal plan for Razorpay:
[docs/payments/razorpay-removal.md](../docs/payments/razorpay-removal.md).

## Existing payments and historical schema

Never delete or rewrite migrations 103/106 or existing financial records to
make a source search empty. Existing Cashfree rows retain their real provider
and identifiers. They cannot be refunded using Razorpay credentials. Such
refunds are surfaced as `manual_required`, with the original provider/payment
reference preserved for operator review. Never pay manually while an old
provider refund could still be pending; reconcile its dashboard first.

Old Cashfree webhooks/checkout payloads are no longer accepted by the new
runtime. Reconcile old pending captures/refunds before cutover, retain the
previous account for historical review and follow the release checklist.
Rider/store payouts are an internal ledger/manual payout workflow; replacing
the checkout gateway does not silently move these to RazorpayX or change bank
beneficiaries.

## Verification and deployment

See [RAZORPAY_RELEASE.md](RAZORPAY_RELEASE.md). Unit tests use fake credentials
and mocked provider APIs; SQL tests use a disposable local database. They do
not charge, capture, refund or change the live merchant account.

Official references:
- https://github.com/razorpay/react-native-razorpay
- https://razorpay.com/docs/webhooks/validate-test/
- https://razorpay.com/docs/payments/payment-gateway/react-native-integration/standard/
- https://razorpay.com/docs/api/refunds/normal/
