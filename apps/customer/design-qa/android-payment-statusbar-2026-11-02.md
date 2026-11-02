# Android payment and status-bar verification - 2026-11-02

Release source: `codex/customer-ui-release-refresh`, integrating main `a4de076dcc019c750fb366fb8a5cbb34f2af2a1f` with the customer UI/location/status-bar updates. This is source verification, not approval of an uploaded release artifact.

## Verified

- Customer Jest: 54 suites, 335 tests passed after integrating main and updating the welcome boot smoke test. Includes welcome timing, status-bar focus, location and payment regression coverage.
- Backend Vitest: 218 files, 1,338 tests passed, including payment creation, intent, verification, recovery, webhook and refund logic tests. These are automated checks, not proof of a real provider refund.
- Customer TypeScript and focused ESLint pass (zero warnings/errors).
- Live public `/payments/availability`: online, COD and UPI intent enabled; `upi_email_optional` is **true** after the guarded rollout below.
- Existing Android email-optional implementation is merged in main. Cart and payment recovery ask for email only when the server capability is absent/false. iOS uses a different native checkout path and is not covered by this switch.

## Changes

- Focused screens own the system status bar; inactive retained stack screens release it.
- Returning from an external payment app reapplies status-bar visibility/style.
- Home switches status-bar icons from light to dark as its blue header collapses onto the white background.
- Unavailable-area title reads the configured copy key, retaining the requested new title when a server still sends the previous built-in default.

## Remaining gates

- Lightsail rollout completed: `RAZORPAY_UPI_EMAIL_OPTIONAL=true` on current deployed release `a4de076dcc019c750fb366fb8a5cbb34f2af2a1f`. Both API replicas and worker passed rolling health checks. Both API containers confirmed live mode and emailOptional true; public availability confirmed true. Existing credentials were preserved and not displayed/copied.
- Android `d2a09beb` reconnected. Updated Metro runs on IPv4 localhost:8084 with USB reverse forwarding, using the live API. Signed in with the approved reviewer account. Verified device-location Google Maps, Home, Profile, installed PhonePe/Google Pay rows and logos, live netbanking picker/SBI search, and empty MobiKwik form with disabled Continue. No wallet account was linked. Verified dark status icons on white payment/collapsed Home screens and light icons on blue expanded Home. Left local app on Home.
- Current source browsing/payment-method screens verified on device. A fresh selected-app UPI handoff and cancellation/reconciliation check still requires one separately authorized pending checkout; no new checkout was created in this run.
- Existing Play build 12 cannot gain new JavaScript checkout/status-bar changes from the server switch alone. Build/test a replacement AAB after source/device checks are complete.
- Read-only provider verification on 2026-11-02 confirms the existing INR 1 live UPI payment was fully refunded, with its matching provider refund marked processed and the application record completed. This clears that live example; the older sandbox HTTP 400 investigation is separate.

No new live orders, payments, refunds, uploads or publications were performed. The existing production API/worker received only the non-secret email-optional configuration correction.

## Welcome and category artwork follow-up

- Diwali welcome artwork is bundled locally and visually verified on the connected Android device. Its 3.5-second viewing timer begins after the image displays; local session/location/cart restoration proceeds in parallel. Timer cleanup and decode-error escape have focused regression coverage.
- The installed development client still has its earlier native splash resource; the committed splash configuration removes that logo in the next native build. Metro initialization delay is not an artwork download.
- Festival and Regional artwork are bundled locally with distinct decorative bottom edges and square corners; Meat retains its separate scalloped edge.
- The candidate now includes main’s background-query focus handling and corrected customer-app Sentry project configuration.
