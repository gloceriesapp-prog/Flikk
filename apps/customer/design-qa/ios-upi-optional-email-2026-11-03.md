# iOS direct UPI optional-email candidate - 2026-11-03

## Source behavior

Both cart and saved-order recovery use one preflight for the merchant optional-email capability. With `upi_email_optional: true`, iOS skips the Gloceries receipt-email form, does not fetch saved receipt email, and omits the email property entirely from the Razorpay Custom UI request. Only the real account phone is forwarded. Missing/false capability retains the existing merchant contact requirement.

Selected-app identifiers still come from Razorpay discovery. Live environment, native support, availability, expiry, session epoch, order/amount/currency, callback signature shape and backend verification protections remain. Standard Checkout is not substituted for the selected UPI app. Cancellation retains the saved order and requests server reconciliation; it never claims capture from the external app return.

The shared preflight preserves Android's existing server-created intent path.

## Verification

- Live public payment availability returned online=true, upi_intent=true and upi_email_optional=true.
- Customer Jest: 55 suites / 347 tests pass, including no-email native payloads, saved-email omission, phone validation, legacy capability behavior, selected-app restrictions and cancellation/recovery.
- TypeScript and full zero-warning ESLint pass. Whitespace checks pass.
- The connected iPhone became reachable after unlock and its currently installed app is at Login. The candidate has not been installed there. No new live order, payment, refund, provider request or TestFlight upload was performed.

## Required exact-build gate

Android's prior successful live email-free S2S payment is not proof of native iOS SDK acceptance. Razorpay's React Native Custom UPI reference documents SDK-discovered app identifiers and selected-app intent routing: https://razorpay.com/docs/payments/payment-gateway/react-native-integration/custom/additional-features

A replacement iOS build must demonstrate a real no-email customer choosing an installed UPI app, successful external-app opening, cancellation/return and same-order backend reconciliation. Do not mark that gate passed from mocked tests. Do not authorize a payment during a pending-checkout-only test.

The Mac has approximately 1.7 GiB free, insufficient for a reliable new TestFlight archive. Preserve source, release archives, original IPAs, signing material and database volumes while making room. Existing native crash and other release gates remain separate; this source fix does not clear them.
