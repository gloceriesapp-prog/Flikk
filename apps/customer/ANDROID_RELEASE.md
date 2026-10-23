# Customer Android releases through GitHub

The customer app has its own npm lockfile. The workflow uses `npm ci` in
`apps/customer`, applies its persisted native patches, runs TypeScript, ESLint and
Jest, generates Android using Expo Prebuild, then runs Gradle `:app:bundleRelease`.
Prebuild generates native code locally on the GitHub runner; no EAS cloud build
or Expo Go is involved.

## One-time GitHub configuration

Create environment `customer-android-production` in the Flikk repository. Select
**Selected branches and tags**, then add branch rule `main`. Keep production
signing credentials restricted to this environment.

Environment secrets:

| Name | Source |
| --- | --- |
| ANDROID_KEYSTORE_BASE64 | Existing **customer** upload keystore, Base64 encoded |
| ANDROID_KEYSTORE_PASSWORD | Password for that keystore |
| ANDROID_KEY_ALIAS | Existing upload key alias |
| ANDROID_KEY_PASSWORD | Password for that key |
| GOOGLE_MAPS_API_KEY | Android Maps key authorized for customer package and signing certificates |
| SENTRY_AUTH_TOKEN | Token authorized to upload customer source maps |

Environment variables:

| Name | Value |
| --- | --- |
| ANDROID_UPLOAD_CERT_SHA256 | Customer Play Console > App integrity > **Upload key certificate** SHA-256 |
| EXPO_PUBLIC_API_URL | Verified HTTPS production backend URL |
| EXPO_PUBLIC_SENTRY_DSN | Customer Sentry project DSN |
| SENTRY_ORG | Sentry organization slug |
| SENTRY_PROJECT | Customer Sentry project slug |

Use the existing customer signing identity. Do not generate a replacement or
assume the Partner key is interchangeable. Never commit signing files, tokens or
local `.env` files. The Firebase configuration already committed under
`config/firebase` must include `com.gloceries.customer`.

## Build and download

1. Review and merge customer changes and this workflow into `main`.
2. Check the highest customer Android version code in Play Console across all
   tracks, including inactive/draft bundles. Choose a strictly higher code.
3. Open Actions > **Customer Android Release** > Run workflow on `main`. Enter
   the new code and the verified highest Play code. Version name is taken from
   `apps/customer/package.json` (currently 1.0.4).
4. Both jobs must pass. The build checks backend health, the existing upload
   certificate, bundletool validation, package/version, production OTA channel,
   native Maps key, production API in the bundled JS, all four ABIs and R8 mapping.
5. Download the `customer-android-<code>-<commit>` artifact at the bottom of the
   successful run. **Extract the ZIP** to obtain
   `gloceries-customer-1.0.4-<code>.aab`. The ZIP itself cannot be uploaded to Play.
   Keep `mapping.txt`, `SHA256SUMS` and `release-verification.json` with the build.
   GitHub retains these artifacts for 14 days; archive release files securely.
6. Test the exact signed candidate before production rollout. Uploading or
   publishing to Play is a separate manual step; this workflow does neither.

## Release limits

A green build does not certify payment refunds, production services, iOS or Play
Console recommendations. See `PRODUCTION_READINESS_2026-10-22.md` for the current
local test evidence and unresolved gates. Local sandbox configuration is never
copied into this release. All bundled `EXPO_PUBLIC_*` values are public; payment
provider secrets belong only on the backend.
