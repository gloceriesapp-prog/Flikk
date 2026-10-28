# iOS selected-app UPI routing

## Problem and implementation

The iOS `upi_app:*` path opened Standard Checkout with a UPI-only payment picker. It did not pass the customer's selected app. Android already uses server-created, package-targeted intent sessions.

Selected iOS UPI payments now use Razorpay Custom UI 2.3.1, with `method: upi`, `_[flow]: intent`, and the exact `upi_app_package_name` returned by its native supported-app discovery. No app-specific payment URL is manufactured and no fallback to the Standard picker is made. Other payment methods retain Standard Checkout; Android's direct-intent flow is unchanged. Android autolinking for the new package is disabled.

The adapter uses the SDK's native bridge and scoped event listeners. It avoids the package's JavaScript wrapper, which logs customer/payment payloads and removes unrelated subscriptions. Missing native modules, unsupported apps, disabled intent, sandbox keys, invalid amounts, expired orders and mismatched callback orders fail explicitly. Checkout checks app eligibility and saved real email before creating an order. Existing durable checkout attempts and server-side signature/captured-state verification remain authoritative; launching an app or receiving a callback alone cannot mark an order paid.

Standard iOS 1.5.9, Custom iOS 2.2.3 and Core 1.0.9 are pinned together to avoid incompatible core versions. The existing strict privacy check also corrects the Custom SDK's exact malformed `Email address` identifier while preserving all collection/purpose/linkage declarations.

## Validation and remaining gates

- Public live API `/payments/availability` returned online=true and upi_intent=true on 2026-10-28. This confirms the public service switch, not an actual bank transaction.
- Native pods resolved successfully with both SDKs and Core 1.0.9.
- TypeScript and targeted ESLint pass.
- Automated tests cover selected-app options, no Standard fallback, unavailable app, live/test mismatch, amount mismatch, cancellation, mismatched provider order, old binaries, discovery timeout and SDK discovery identifiers. Recovery integration tests preserve the same target and server verification; Android intent tests remain covered.
- A new native binary is required. Existing TestFlight build 5 does not contain this change. The UI-only build-6 archive was stopped and was not uploaded.
- Actual selected-app handoff, return/cancellation and server-confirmed capture require physical verification of the replacement binary. No live order, charge or refund was created during this investigation. Store closure must not be bypassed to test checkout.
- This change does not resolve or supersede the other recorded App Store release gates.

## Official references

- https://www.npmjs.com/package/react-native-customui (Razorpay's published SDK README, selected-app UPI configuration and iOS query schemes).
- https://github.com/razorpay/markdown-docs/blob/master/payments/payment-gateway/ios-integration/custom/build-integration.md
- https://github.com/razorpay/markdown-docs/blob/master/payments/payment-gateway/s2s-integration/payment-methods/upi/intent.md (server-created URI integrity; Android route remains unchanged).
