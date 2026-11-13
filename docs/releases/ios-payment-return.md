# iOS UPI payment return

## Behavior

Selecting an installed Google Pay, PhonePe or Paytm app opens the provider's native UPI intent. Gloceries owns the waiting screen. Only server-confirmed paid state clears the matching cart and opens order confirmation. An SDK error or missing callback is not treated as payment failure. Timeout opens the saved order's recovery flow, without creating a second order.

The confirmation countdown runs only while the screen is focused and the app is active. Cancelled orders with a recorded provider payment open their order summary so the customer can see cancellation/refund status.

The Expo plugin patches the pinned Custom SDK bridge during native prebuild; it suppresses only the UPI-intent waiting window and provides a resource-dismissal bridge. Other payment methods retain their SDK UI. Unsupported bridge sources fail the build. The native iOS runtime changes to `1.0.4-ios-native-4`; this needs a new signed native/TestFlight build, not an OTA to older installations. Android runtime is unchanged.

## Verification on 2026-11-13

- The diagnostic native build compiled and installed on the connected iPhone.
- One approved INR 1 checkout opened Google Pay. The user independently authorized payment. Backend reconciliation confirmed paid and the app returned to Home with the active order bar.
- A stale React Query quote caused a Cart render exception after cart clearing. The cart now ignores quotes whose identities/quantities no longer match.
- The foreground-only confirmation timer was corrected after that device run; its regression test verifies the full visible interval after return. It still requires exact replacement TestFlight verification.
- 70 targeted customer tests, 33 payment/refund backend tests and the native plugin test passed. Customer/backend TypeScript and targeted ESLint checks passed.

## Unresolved refund

The earlier INR 1 checkout was cancelled for store non-response. Its backend refund is marked failed; Razorpay's signed-in dashboard confirms the payment is captured and no refund has been issued. The dashboard did not expose the API rejection cause. No refund or additional payment was submitted by the agent. This change adds bounded provider code/reason diagnostics, not a refund retry or a claim that refunds are repaired.

## Release gates

1. Merge the dependent cart/discovery fix and this follow-up through review.
2. Deploy bounded backend diagnostics and establish the exact refund rejection cause; reconcile the existing failed refund without duplicate money movement.
3. Produce a signed build with the new native runtime. Test the exact TestFlight artifact: successful handoff/return, cancellation, background/foreground, network interruption and relaunch recovery. Any new real checkout/payment requires separate authorization.
4. Confirm a paid order displays confirmation for the full visible interval, then tracking, without Cart errors or the SDK waiting page.
5. Keep public release blocked until refund and exact-build checks pass. No store upload, OTA, production deployment or refund is performed by this PR.

## Automatic refund follow-up

The refund worker now preserves retryability for Razorpay's specifically documented low-merchant-balance rejection. It keeps the same frozen amount and idempotency key, checks provider history before sending, and does not retry unknown permanent errors. The new customer lifecycle migration adds accepted-provider visibility and one deduplicated inbox/push-outbox message per requested, initiated, completed or attention event. Combined trip notifications are not repeated for each shop.

Local verification: 34 refund/provider tests and 14 customer recovery/presentation/summary tests; a complete 185-migration build in disposable PostgreSQL and lifecycle SQL assertions passed. The test server was stopped. No historical failed jobs, provider funds or production data were changed. Apply the new migration before releasing the new customer UI; verify the live merchant rejection and reconcile the existing failed job using its preserved request identity. The fix cannot supply merchant funds or enable account-level refund permission.

Reference: https://razorpay.com/docs/api/refunds/create-normal/ and https://razorpay.com/docs/api/refunds/normal-refunds-idempotent/.
