# Razorpay cutover checklist

## Current verified account/deployment observations

- Migration developed from GitHub main `2e4e17a`, not the older local checkout.
- Razorpay MCP read-only order query succeeds. This does not expose/check
  merchant method enablement, webhook settings, S2S permissions or live SDK flows.
- Railway project `imaginative-generosity` has production `Flikk` and `worker`
  services. Configuration inspection showed Cashfree credentials and no
  `RAZORPAY_*` variables on either service. User confirmed keys are not added.
- Expo MCP is registered globally but its tools are not available in this
  running conversation; reconnect/reload the integration to expose them.
- Read-only production schema check confirmed the new Razorpay attachment RPC
  and payment-incident table are not applied yet.
- No live payment, refund, migration or deployment was performed during coding.

## Prepare

1. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, independent
   `RAZORPAY_WEBHOOK_SECRET` and matching `RAZORPAY_ENV` to both API and worker.
   Use Railway private/sealed variables or environment files excluded from Git.
2. Configure the webhook and automatic payment capture on the intended Razorpay
   account. Keep test and live credentials, secrets and database environments
   separate. Read-only MCP cannot enable payment methods or certify S2S settings.
3. Apply the new append-only migration in staging, with the API/worker release
   that calls its new provider-fenced RPCs. Do not change old migration files.
4. Build a **new native customer Android/iOS app**, not an OTA-only JS update.
   The installed Cashfree native binary cannot acquire the Razorpay SDK through
   Expo Updates. Keep runtime-version compatibility tied to native builds.

## Staging and device acceptance

Record build/version, environment, target ID and provider IDs without secrets:

- COD and single-/multi-store online order happy paths; quote matches charge.
- Card success/decline, netbanking list/return and account-enabled methods.
- Physical Android UPI with installed apps; physical iOS supported UPI apps.
  Check intent launch, app return, cancellation and missing-app behaviour.
- Timer continues while the app is backgrounded; app restart restores payment.
- Delayed capture, provider timeout and lost create/verify responses.
- Duplicate create requests, repeated callbacks/webhooks and altered signatures.
- Wrong customer, target, payment/order ID, amount and currency are rejected.
- Stock expiry and COD conversion followed by late payment queue one refund.
- Partial/full refunds, multi-store cancellation, refund timeout/retry and
  historical-provider manual review, with no duplicate money movement.

Mocks and bundles cannot prove an installed UPI app launch. A live smoke charge
requires a separately approved amount/recipient and a real device; no such
transaction is performed automatically by repository tests.

## Internal-test cutover

Disable new online checkouts during the provider transition. Reconcile old
Cashfree pending payments/refunds first; retain historical access. Apply the
migration and deploy matching API **and worker**, upload the new native app to
internal testing and require testers to install it before re-enabling online
checkout. Old app versions still use a different SDK/API contract and must not
be allowed to start new online payments against the switched backend.

Monitor payment verification failures, stuck creation claims, webhook retries,
late-capture/refund jobs and `manual_required` outcomes. Validate all three
components (API, worker, native app) use the same account. Do not delete old
financial rows or roll provider identifiers back as a rollback tactic. A safe
rollback first stops new attempts and reconciles the provider that actually
received each payment.
