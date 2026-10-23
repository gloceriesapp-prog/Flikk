# Customer app readiness - 22 October 2026

Status: functional automated checks and local COD flow pass; production release approval and dependency-security review are still pending.

## Changes in this audit

- Aligned the independent customer app dependencies with Expo SDK 57, including React Native 0.86.3, the supported Sentry package, and expo-notifications 57.0.24. Removed app-local EAS CLI; invoke EAS through `npx eas-cli` when needed.
- Resolved the React/Jest peer conflict with the matching React Native Jest preset and test-renderer 1.2.0. Updated the customer lockfile.
- Applied bounded Glide image-loading patches for notification images and the Expo Updates reload artwork. Existing Maps and Razorpay patches still apply.
- Added a reproducible Android config plugin that enables release minification, resource shrinking, optimized resource shrinking, and optimized ProGuard defaults. It retains reflective Room/WorkManager constructors and rejects an unrecognized Gradle template.
- Set package/app version to 1.0.4 with the appVersion update-runtime policy. These native dependency changes must not share the shipped 1.0.3 runtime.
- Registered Sentry's native config plugin consistently, blocked Android advertising-ID permission, and strengthened the release configuration gate.
- Added release-configuration regression tests and removed unused UI code. The visible UI was preserved.
- Physical COD testing found that the receipt incorrectly claimed payment success before collection. Its heading now says "Order confirmed" and its amount label says "Order total"; regression tests cover COD and verified online receipts.
- Updated transitive shell-quote to 1.12.0 within its existing dependency range, removing the critical audit finding.
- Follow-up sandbox testing fixed a recovery-screen race: periodic reconciliation no longer disables a checked unpaid bank picker mid-selection. Every payment action still performs fresh server reconciliation before charging.
- Fixed a rating double-submit race between the order card and bottom prompt by checking the shared mutation cache synchronously at tap time.

## Automated validation

| Check | Result |
| --- | --- |
| Customer Jest suite | 39 suites, 236 tests passed after sandbox follow-up |
| Customer TypeScript | Passed |
| Customer ESLint | Passed, zero warnings |
| Expo Doctor | 21/21 passed |
| patch-package | All four patches applied without warnings |
| Backend customer/checkout/payment/history/notification tests | 44 files, 272 tests passed |
| Local database order lifecycle | Passed; fixture transaction rolled back |
| Clean Android project generation | Passed in an isolated temporary project with synthetic build configuration |
| Production Android JavaScript/Hermes export | Passed with synthetic release configuration; not a signed native build |
| Production dependency audit | Zero critical; 42 package findings remain (33 high, 9 moderate), traced to build tooling |

The database lifecycle test checks COD creation, item snapshots, inventory reservation, checkout idempotency, unpaid-order isolation, wrong-amount rejection, verified-payment merchant visibility, one merchant notification intent, packing, pickup, delivery proof, and replay protection. It does not call a payment provider or deliver notifications.

Commands used:

```sh
cd apps/customer
npm test -- --runInBand --watchman=false
npm run typecheck
npm run lint
npx expo-doctor
npm run postinstall

cd ../../backend
pnpm exec vitest run src/customer-experience src/lib/checkout src/lib/customer src/payments src/history src/routes/customer src/notifications --maxWorkers=2 --minWorkers=1
node scripts/test-partner-customer-order.mjs
```

## Physical Android checks

Device: OnePlus CPH2381, Android 14. App: com.gloceries.customer.local, connected through USB port forwarding to local Metro and the local API.

Verified with the current JavaScript bundle:

- Login screen, guest browsing, and the documented synthetic local customer login/OTP.
- Real local catalog loading, product Add control, quantity changes, and cart navigation.
- Guest checkout requires sign-in before adding an address.
- Current-location onboarding and map-pin confirmation.
- Required recipient/building/street/landmark fields and optional floor/entrance directions.
- Synthetic local address confirmation, saving, and selection in checkout.
- Checkout quote: item 26 + delivery 32 + handling 5 = INR 63.
- Purchase screen navigation, including its explicitly development-only sample order.
- Payment-method loading, netbanking grid, bank search, and wallet number-form expansion.
- App restart preserves the authenticated local test session and cart. Profile shows the expected synthetic account.
- COD order creation, receipt, tracking, and cancellation. The local database confirms the synthetic order's final status is cancelled and payment method is cod.
- When online checkout is disabled, the payment screen hides online methods and offers COD with an explanatory message.

Docker's stalled supervisor initially left Supabase unavailable, causing HTTP 500 store discovery. Docker was restarted without deleting containers or volumes. Supabase containers recovered and the same browse request returned HTTP 200; the app recovered and displayed local products.

## Outstanding release gates

1. **Gateway refunds/webhooks:** sandbox online checkout is now enabled and success, failure, cancellation, and recovery were exercised. The actual sandbox refund remains blocked by Razorpay HTTP 400 (details below). Hosted webhook delivery and provider refund completion have not passed.
2. **Exact native candidate:** the installed local binary is 1.0.3 and predates this audit's native updates. Clean prebuild and JavaScript tests do not replace compiling and testing the new signed release binary. Build and inspect the 1.0.4 candidate, its merged manifest, R8 mapping, permissions, and runtime behavior.
3. **Production services:** hosted API, production data, delivery operations, actual push delivery, and production provider webhooks have not been certified in this local audit. Hosted checks were deferred by the user while backend hosting changes are in progress.
4. **iOS:** no physical iOS or signed iOS release test was performed.
5. **Store validation:** a Play Console warning-free outcome cannot be guaranteed from source or prebuild alone. Upload the tested candidate to internal testing, review Play's processing/pre-launch results, and resolve any remaining findings before production rollout.
6. **Build dependency advisories:** review the remaining audit findings before release. The exported production source map has 3,682 modules and includes none from braces, image-size, node-forge, postcss-selector-parser, sprintf-js, or shell-quote. This establishes JavaScript bundle exclusion for this export, not blanket security clearance for the build system or native dependencies. Avoid automatic SDK downgrades proposed by npm audit fix --force.

## Dependency advisory evidence

The remaining five underlying packages are reached through Tailwind/PostCSS, Metro, Expo CLI/code-signing tools, and the React Native Jest toolchain. They are not present in the exported release JavaScript. Their build-time risk still needs review; arbitrary downloaded assets or untrusted build inputs should not be treated as safe merely because the packages are absent from the app bundle.

- [shell-quote command injection](https://github.com/advisories/GHSA-pqg4-j6r4-53mv): updated to 1.12.0, outside the affected range.
- [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): the advisory lists no patched version.
- [node-forge signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv): the advisory lists no patched version.
- [sprintf-js precision denial of service](https://github.com/advisories/GHSA-hp3w-g68c-fv3c): the advisory lists no patched version.
- image-size and postcss-selector-parser need compatible upstream/toolchain remediation; forced major overrides were not applied during this audit.

## Sandbox follow-up

After the user finished configuring sandbox payments, the backend was restarted to load the updated environment. Its public availability endpoint reports online=true, cod=true, upi_intent=false. Real UPI-app handoff is deliberately unavailable in sandbox.

On the physical Android device, using the synthetic local account/contact:

- HDFC test netbanking opened the Razorpay mock bank page.
- Provider checkout cancellation returned to the same unpaid order's recovery flow.
- Choosing mock-bank Success produced a captured INR 63 payment. The app showed Paid online, and the local order recorded the provider payment after server verification.
- Choosing mock-bank Failure on a separate checkout showed the bank-decline message. Returning to the app preserved an unpaid recoverable checkout; no captured payment was recorded for it.
- Both sandbox test orders were cancelled during cleanup. The captured order is FLK-21; the failed/unpaid order is FLK-22. The earlier COD fixture is FLK-20.

An isolated guarded invocation of the existing refund worker processed only FLK-21's refund intent. It required a loopback database, test-mode key prefix, the cancelled synthetic order, and no unrelated active refund jobs. Notification and delivery workers stayed stopped.

Refund outcome: **not passed**. The provider payment is captured for 6,300 paise, and its refund list is empty. Refund creation returns HTTP 400, BAD_REQUEST_ERROR, description "invalid request sent". A retry through the existing durable operation returned the same rejection. The refund job remains failed and was never marked completed. No live money moved. The root cause of this rejection has not been established; provider/account-specific diagnosis is required before release.

The request uses the documented [idempotent normal-refund API](https://razorpay.com/docs/api/refunds/normal-refunds-idempotent), including a stable X-Refund-Idempotency header. Idempotency was not removed or weakened to obtain a successful response.

The synthetic address, authenticated local session, cancelled test orders, and one cart item remain available for continued testing. No customer production order, live payment, deployment, or store submission was made by this audit. A nonfatal InteractionManager deprecation warning remains in the current development Home implementation; it is not a crash or a passed native-release test.

## GitHub customer release setup

A dedicated Customer Android Release workflow now uses Gradle on GitHub runners.
The customer environment is separate from Partner and restricted to `main`.
See `ANDROID_RELEASE.md` for required configuration and artifact download steps.
The isolated release branch passes 39 Jest suites / 236 tests, TypeScript and
ESLint. No signed AAB has been produced yet: customer signing/service
configuration and the highest Play version code must be supplied first.
