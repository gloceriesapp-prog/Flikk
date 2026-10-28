# iOS selected-app UPI routing

## Problem and implementation

The iOS `upi_app:*` path opened Standard Checkout with a UPI-only payment picker. It did not pass the customer's selected app. Android already uses server-created, package-targeted intent sessions.

Selected iOS UPI payments now use Razorpay Custom UI 2.3.1, with `method: upi`, `_[flow]: intent`, and the exact `upi_app_package_name` returned by its native supported-app discovery. No app-specific payment URL is manufactured and no fallback to the Standard picker is made. Other payment methods retain Standard Checkout; Android's direct-intent flow is unchanged. Android autolinking for the new package is disabled.

The adapter uses the SDK's native bridge and scoped event listeners. It avoids the package's JavaScript wrapper, which logs customer/payment payloads and removes unrelated subscriptions. Missing native modules, unsupported apps, disabled intent, sandbox keys, invalid amounts, expired orders and mismatched callback orders fail explicitly. Checkout checks app eligibility and obtains a real receipt email through a one-time consent form before creating an order. The form uses the existing protected payment-contact endpoint; cancellation, failed saves and account changes do not start payment. The SDK contact is fetched from the authenticated account plus the saved receipt contact, because the existing provider-order response contains no customer object. Existing durable checkout attempts and server-side signature/captured-state verification remain authoritative; launching an app or receiving a callback alone cannot mark an order paid.

Standard iOS 1.5.9, Custom iOS 2.2.3 and Core 1.0.9 are pinned together to avoid incompatible core versions. The existing strict privacy check also corrects the Custom SDK's exact malformed `Email address` identifier while preserving all collection/purpose/linkage declarations.

## Validation and remaining gates

- Public live API `/payments/availability` returned online=true and upi_intent=true on 2026-10-28. This confirms the public service switch, not an actual bank transaction.
- Native pods resolved successfully with both SDKs and Core 1.0.9.
- TypeScript and targeted ESLint pass. All 51 suites / 320 tests pass with Watchman disabled for the local sandbox permission restriction.
- Automated tests cover selected-app options, no Standard fallback, unavailable app, live/test mismatch, amount mismatch, cancellation, mismatched provider order, old binaries, discovery timeout and SDK discovery identifiers. Recovery integration tests preserve the same target and server verification; Android intent tests remain covered.
- A new native binary is required. Existing TestFlight build 5 does not contain this change. The intermediate build-7 archive compiled successfully but is superseded by the receipt-contact fix and must not be uploaded. The UI-only build-6 archive was stopped and was not uploaded.
- Physical QA found that the native SDK returns `appPackageName`, not only the previously supported `shortcode` shape. The parser now accepts the observed response and regression tests use that real structure. Google Pay, PhonePe and Amazon Pay appear with logos on the connected iPhone. Discovery failures are surfaced instead of silently hiding every app.
- Physical QA also exposed minified-release safe-area overlap. Preserving the provider displayName restores NativeWind safe-area variables; corrected Home, Checkout and payment-selection screens were visually verified.
- One live sample checkout (FLK-100076, INR 1) opened PhonePe and returned to Gloceries with a confirmed receipt. The user explicitly confirmed completing the payment on the phone. The agent did not enter a UPI PIN or tap payment authorization. Read-only Razorpay inspection independently confirms UPI captured=true, amount=100 paise and matching backend order metadata. No additional checkout or refund was performed.
- These physical checks used the temporary native QA copy, not exact TestFlight build 8. Cancellation, other selected apps and exact replacement TestFlight installation remain to verify. Store closure must not be bypassed to test checkout.
- This change does not resolve or supersede the other recorded App Store release gates.

## Official references

- https://www.npmjs.com/package/react-native-customui (Razorpay's published SDK README, selected-app UPI configuration and iOS query schemes).
- https://github.com/razorpay/markdown-docs/blob/master/payments/payment-gateway/ios-integration/custom/build-integration.md
- https://github.com/razorpay/markdown-docs/blob/master/payments/payment-gateway/s2s-integration/payment-methods/upi/intent.md (server-created URI integrity; Android route remains unchanged).

Additional receipt-contact tests cover explicit save, synthetic-email rejection, reuse, cancellation, save failure and account changes. No real customer email is included in this report or source.

The iOS runtime is isolated as `1.0.4-ios-upi-1`; the marketing version alone cannot distinguish the added native Custom SDK from earlier 1.0.4 binaries. Android's runtime policy is preserved. Temporary on-device QA uses a separately signed copy with updates disabled so it must load the freshly bundled JavaScript; that copy is not an App Store artifact. The final archive must be checked separately.
