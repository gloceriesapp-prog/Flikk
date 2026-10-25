# Customer iOS release preparation

## Identity and build configuration

- App Store Connect app: Gloceries, Apple ID `6826692403`.
- Bundle identifier: `com.gloceries.customer`.
- Marketing version: `1.0.4`; App Store draft uses manual release.
- TestFlight had no builds when checked on 25 October 2026. For the first upload use build `1` and highest uploaded build `0`; recheck before every subsequent upload.
- API: `https://api.gloceries.com`, with Metro host rewriting disabled.
- Google Maps is used on both platforms. iOS requires its own `IOS_GOOGLE_MAPS_API_KEY`, restricted to this bundle identifier and Maps SDK for iOS. The native plugin installs the Google SDK and initializes it. Scene support is enabled for current iOS lifecycle compatibility.
- Sentry organization/project: `gloceries` / `customer-app`. Keep the upload token private and the public DSN scoped to this project.

## Direct Xcode release preflight

Provide existing configuration securely in the build environment. Never commit `.env.local`, `.env.production.local`, signing material or tokens. The local production file is separate from development overrides. Server payment secrets belong only on the backend.

Set `NODE_ENV=production`, `CUSTOMER_DIRECT_IOS_RELEASE=true`, `EAS_BUILD_PLATFORM=ios`, `CUSTOMER_IOS_BUILD_NUMBER`, `CUSTOMER_HIGHEST_IOS_BUILD_NUMBER`, `APPLE_TEAM_ID`, `IOS_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_FOLLOW_METRO_HOST=false`, `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`. Load local environment files with Expo's environment loader before running `node scripts/verify-release.cjs`; the script itself does not load files.

The preflight rejects a local/staging API, missing iOS Maps configuration, duplicate build number, wrong Sentry project and publicly exposed provider secrets. It validates configuration, not provider functionality or App Store approval. Generate the native project from this reviewed commit, archive with the intended distribution team, validate in Organizer and upload to TestFlight. Check source-map and dSYM uploads before treating crash reporting as verified.

## Closed-store behavior

Customer discovery includes otherwise eligible closed stores. Their `is_active=false` value is preserved so customers can browse and prepare a cart. Existing checkout eligibility still rejects ordering from closed stores. Suspended stores, geographic restrictions and checkout checks remain enforced. Public discovery responses use an explicit merchant-field allowlist.

## Validation of this branch

On 25 October 2026 the full customer suite passed: 41 suites, 261 tests. The full backend suite passed: 205 suites, 1,284 tests. Customer TypeScript/lint and backend build/lint passed. The local production configuration passed preflight using existing local Maps and Sentry settings, without copying credentials to another service. The public live health and payment-availability endpoints responded successfully.

The native map regression covers an ordered Google Maps zoom range (14 through 21), scene-based startup, camera readiness/layout, pin-coordinate projection, precise recentering and one shared pin artwork. A compatible brace-expansion patch removes a high-severity build-tool advisory; 14 audit entries remain (9 high, 5 moderate, including propagated dependency findings). Forced Expo downgrades are not a safe resolution.

## Remaining release gates

- Install and test the exact signed Release/TestFlight binary on iPhone; current physical evidence is a development build.
- Resolve the sandbox refund request failure (`BAD_REQUEST_ERROR: invalid request sent`) before certifying payment/refund completion. Read-only live payment availability is not a successful charge/refund test.
- Confirm approved real product inventory and service coverage for launch. Do not substitute fake production products.
- Finish accurate App Store screenshots, descriptions, privacy declarations, support/privacy URLs, age rating and an accessible reviewer login. Confirm account deletion and review access to serviceable content.
- This app supports iPad; verify its layouts and supply the required screenshots.
- Verify APNs, payment hand-off/webhooks, source maps and dSYMs on the distribution build.
- Review outstanding dependency audit findings and historical Sentry crashes against the exact release.
- Free sufficient disk space before archiving: the Mac had only about 1.5 GB available at the latest check.

No production order, charge or refund is created by these configuration checks. No build has been submitted for App Review by this change.
