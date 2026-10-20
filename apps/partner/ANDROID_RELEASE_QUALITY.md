# Partner Android release quality

Candidate **1.0.4** changes the native runtime. An OTA update cannot apply these changes to an older binary.

## Current readiness — 19 October 2026

The corrected local ARM64 release build, automated checks, and limited signed-in Android 14 smoke tests pass. Physical testing found and fixed a WorkManager startup crash and an Orders landscape scrolling issue before release. Map tiles remain unverified because Google rejects the isolated test package/certificate. **The local AAB is not ready for Play upload:** it uses a debug signing key and version code 1. A production-signed, all-ABI build with the next EAS version code and device validation remain required. No candidate 1.0.4 bundle has been uploaded to Play or analysed by Google.

## Implementation

`plugins/withAndroidReleaseQuality.cjs` runs during Expo prebuild:

- Pins AGP 9.0.1, uses optimized ProGuard defaults, and enables R8 shrinking, optimization, obfuscation, and optimized resource shrinking. Library JNI/reflection consumer keep rules remain intact. Narrow member rules explicitly retain default constructors for RoomDatabase and InputMerger subclasses under AGP 9 strict keep-rule semantics.
- Retains the supported legacy Kotlin/DSL/source-set migration switches needed by Expo 57/RN 0.86. Registers library codegen early and pins NDK 27.1.12297006. The Expo Gradle plugin patch handles AGP 9's removal of library `targetSdk`; the application target remains 36.
- Removes orientation/aspect-ratio restrictions and permits resizing. The login form scrolls, respects safe-area insets, and remains reachable with the keyboard or a short landscape window.
- Removes deprecated theme bar-color/edge-to-edge opt-out attributes. A release-only ASM transform routes dependency color calls and cutout writes through `SystemBarCompat`, excluding the helper itself. API 35+ avoids the deprecated bar color APIs; older Android versions retain their styling. DEFAULT/SHORT_EDGES cutout writes become ALWAYS on API 30+, while pre-30 behavior and explicit NEVER/ALWAYS remain. Stack effects are identical, so existing bytecode frames are preserved.

`patches/expo-updates+57.0.26.patch` replaces Expo Updates' manual network bitmap decoding with Glide 5.0.5. Decoding is bounded to display dimensions, at most 2048px per axis; Glide manages caching and request cleanup. File, remote, and data image sources remain supported. Root `postinstall` applies both dependency patches on clean installs. These shared Android dependency patches also apply to Rider, which retains its existing AGP configuration.

Do not add blanket keep rules, disable R8, lower the target SDK, or remove required image decoders to hide diagnostics. Other reported bitmap paths belong to managed Glide/Fresco/cropper/animated-image/Maps loaders. `AppImage` already uses Expo Image with caching and safe downsampling. Those remaining library references require Google's new-bundle analysis; their presence alone does not show an unbounded app-written loader.

## Verification

From the repository root, with JDK 17 available:

```sh
npm run test:android-release-quality --workspace=apps/partner
npm run typecheck --workspace=apps/partner
npm run lint --workspace=apps/partner
npm run verify:android-release --workspace=apps/partner -- /absolute/path/app-release.aab
```

The verifier checks packaged DEX, AGP version, a nonempty obfuscation mapping, R8 optimizer flags, and optimized resource shrinking in the bundle metadata. A locally calculated renamed-class percentage is **not** the Google Play score. CI runs the release checks, Expo prebuild, and the native ASM transformation test. The artifact cases reject missing R8 metadata, disabled optimized resource shrinking, an older AGP version, and stripped Room/WorkManager default constructors.

For native plugin tests after Android prebuild, from `apps/partner`:

```sh
./android/gradlew -p android/buildSrc test --no-daemon --max-workers=2
```

## Verified candidate result

The isolated generated project in ignored `apps/.partner-release-audit` uses copied entry files, source links to Partner, a single ARM64 ABI, and debug signing. Keep its entry and NativeWind stylesheet resolution consistent. Sentry upload is disabled only for local validation; production monitoring guards remain enabled.

- The corrected `bundleRelease` passed in 8m 58s (970 tasks; 54 executed, 916 up-to-date), including JS/source maps, ASM instrumentation, R8, native compilation, release vital lint, and bundle packaging.
- All twelve release checks pass, including seven configuration/API policy tests with API 24–36 fixtures and five artifact-gate cases. The ASM JVM test, TypeScript, ESLint, patch applicability, and scoped whitespace checks pass.
- Bundle metadata confirms AGP 9.0.1 and R8 shrinking/optimization/obfuscation enabled, with `resourceOptimization.isOptimizedShrinkingEnabled=true`.
- Mapping: 9,050/10,425 classes renamed (86.8% local count). R8 no-obfuscation/no-optimization/no-shrinking statistics: 19.65/20.19/19.59. These are not a confirmed Play score.
- The compiled reload image loader references Glide and bounded dimensions, with no `BitmapFactory`, `decodeStream`, or `URLConnection` reference.

Local evidence under `apps/.partner-release-audit/artifacts/`: `device-1.0.4/rebuild-reflection-fix.log`, `device-1.0.4/fixed-bundle-verification.txt`, `pr-native-policy-tests.log`, and `reload-image-bytecode.txt`. These generated files are not committed.

The earlier 1.0.3 build was smoke-tested on an Android 14 phone for launch, keyboard/Continue accessibility, rotation, and background recovery. **That does not validate the new 1.0.4 native changes.** The phone was subsequently reconnected for candidate 1.0.4 testing; see the device follow-up below.

## Before Play upload

1. Build EAS profile `production` using the existing production environment/signing credentials, all configured ABIs, and automatic version-code increment. The previous cloud attempt was refused because the monthly Android quota was exhausted (reset 1 November 2026). It advanced the remote counter to 14 without producing a build; use the next available version code. Do not upload the local debug-signed ARM64/code-1 validation AAB.
2. Run the artifact verifier against the actual production AAB. Retain mapping and production Sentry symbols.
3. Test the new release on Android 15+ and a large screen: system bars, image picker/cropper, sheets, maps, keyboard, rotation, and split-screen. Validate authenticated orders, notifications, and transactions with a test account.
4. Upload to the normal Play internal-testing track and inspect Google's analysis for this bundle. Repository/build success does not clear warnings attached to release 13.

Release notes are in `release-notes/1.0.4.txt`. No candidate production upload or Google Play publication has been performed.


## Physical-device follow-up — 19 October 2026

The Android 14 OPPO CPH2381 was reconnected. The first candidate 1.0.4 launch crashed in WorkManager startup with `NoSuchMethodException: androidx.work.impl.WorkDatabase_Impl.<init>()`. This is a release blocker discovered on-device after compilation, lint, and optimizer metadata checks passed. The test APK's DEX and 26 ARM64 native libraries were verified byte-identical to the release AAB; package/provider isolation and debug signing preserve the installed production app and its data.

The Room 2.6.1/WorkManager 2.9.1 consumer rules keep classes without explicitly keeping default constructors. AGP 9 defaults to `android.r8.strictFullModeForKeepRules=true`; constructor preservation must now be explicit. The prebuild plugin adds narrow `-keepclassmembers` rules for public no-argument constructors in RoomDatabase and InputMerger subclasses, without disabling shrinking/optimization/obfuscation. The artifact verifier checks constructors in both generated databases and WorkManager's InputMergers; a new fixture and the actual failing AAB verify rejection of stripped constructors.

The corrected bundle builds and passes all twelve automated checks and the strengthened artifact verifier. On the physical phone, three successive corrected launches reached login with no fatal exceptions (779/815/700ms activity-launch timings). After aligning the isolated APK resource package with its test application ID, a final cold launch passed at 641ms with no welcome-image URL failure. The DEX and all 26 native libraries remain byte-identical to the corrected source release AAB. Resource package metadata, manifest identity/authorities/permissions, label, and debug signing differ only to isolate the test app.

Passed: incomplete/complete phone-input button states without submitting, portrait with and without the keyboard, landscape including its floating keyboard, scrolling to Continue, phone-value retention across rotation, and background/foreground recovery in the same process. Test digits were cleared. Rotation was restored using the window-manager command; OEM restrictions reject direct `settings put`, so no permission was bypassed. Read-back confirms the original rotation values.

App-scoped logs show no fatal exceptions after the fix. The local harness still logs a nonblocking EAS update check failure because it lacks the production channel header; this is not a verified production OTA test. The installed production package remains 1.0.2/code 12 with its data untouched. Signed-in flows remain pending a user-provided test-store session, and this Android 14 phone cannot verify Android 15/16 enforcement. Evidence is under ignored `apps/.partner-release-audit/artifacts/device-1.0.4/`, including `final-code-identity.json`, `rotation-checks.json`, `repeated-launch-checks.json`, screenshots, and scoped runtime logs.

### Login endpoint correction

The local test build was initially compiled with an incorrect API override, `https://api.gloceries.com`, which does not resolve publicly. Expo's existing production `EXPO_PUBLIC_API_URL` is `https://flikk-production.up.railway.app`; that setting was already correct and was not changed. The correct backend returns HTTP 200 at `/` and the expected unauthenticated HTTP 401 at `/auth/me`; the connected phone also resolves and reaches its host.

The local bundle was rebuilt with the production API value in 3m 6s, passed the release artifact verifier, and was reinstalled and opened successfully. Inspection of the packaged Hermes bundle confirms the correct host and absence of the incorrect host. The isolated APK retains identical DEX and all 26 native libraries from this source AAB. Release login errors now advise checking internet connectivity without exposing the backend address or incorrectly requiring the same Wi-Fi. TypeScript, ESLint, and all twelve release checks pass. Actual OTP submission and signed-in flows still require the user's session; endpoint reachability alone does not verify them.

Evidence: `device-1.0.4/rebuild-production-api.log`, `production-api-bundle-verification.txt`, `production-api-code-identity.json`, and `production-api-launch-runtime.log` under the ignored artifacts directory.

### Signed-in physical checks

The user signed in directly on the phone. Orders, Inventory/search, order history and its Cancelled filter, Payouts, Help & support, Store Settings, Customer reviews, and Store team loaded. The account has no orders, inventory, payouts, reviews, or managers, so these checks cover navigation and empty states, not populated transactions. Add Product and the system photo picker opened; no photo was selected/uploaded, and no product, order, ticket, payout detail, permission, or store setting was changed. Notification permission is off for this isolated app, so push delivery/order alerts remain unverified. The session survived a cold launch and the subsequent APK update.

Landscape Orders testing exposed a fixed bottom bar hiding the empty-state message. Orders now uses one vertical scroll container for its header and queue, with bottom safe-area clearance. Physical retesting confirms the message and supporting text scroll fully above the tabs; portrait navigation remains available. TypeScript, ESLint, and all twelve release tests pass.

Opening the map initially crashed because the local generated project omitted native Maps metadata when dotenv loading was disabled. The published 1.0.3 AAB already contains that metadata. The ignored local manifest was corrected using the existing native SDK key, without changing production credentials. The key matches the published bundle. The native rebuild passed in 7m 28s; packaging the final layout change passed in 2m 9s. The strengthened artifact gate passes, and final test APK DEX/native libraries match the source release AAB.

The corrected map opens without the missing-key crash, but Google logs an authorization failure for `com.gloceries.partner.validation` with the local debug certificate. Map tiles and full map interaction are therefore **not passed**. They require a production-signed internal build or a separately authorized test package/certificate; production key restrictions were not weakened. Android 15+, populated order/product/payment flows, notifications, production OTA, and Google Play analysis remain pending.

Evidence remains local in ignored `device-1.0.4/`: `rebuild-native-map-config.log`, `rebuild-signedin-layout.log`, `native-map-artifact-verification.txt`, `native-map-code-identity.json`, `signedin-final-runtime.log`, and the signed-in screen/rotation XML captures. Private gallery captures were removed rather than retained or published. GitHub checks on commit `a2b89cd0` passed, including all twelve Partner release checks and the native JVM/prebuild check. The admin Vercel preview still fails collecting `/api/app-content` because its server-side Supabase key is missing/empty; it is a separate environment issue.

## Direct Gradle release pipeline — 20 October 2026

`PRODUCTION_RELEASE_PIPELINE.md` describes the manual GitHub signed-release
workflow, independently of the editor used for development. Direct builds fail closed for missing
signing/Sentry/Maps configuration, require operator-confirmed Play version
codes, and preserve the production Updates channel header. The artifact gate
checks the upload certificate and actual packaged configuration as well as
the optimizer checks above. Build logs are redacted before artifact storage.

Validation: TypeScript, ESLint, all 19 release tests and Actionlint pass.
Tests include real signed/unsigned/tampered JAR fixtures and the non-admin
bootstrap refusal. A fresh direct-production-mode Expo prebuild and Gradle
`signingReport` passed with a temporary fixture key; version code, OTA header
and release signing config were checked. The manifest parser was also tested
against the actual local AAB. This does not produce or validate a new
production-signed AAB.

The latest PR #64 checks (all 21) passed after the user configured the admin
Preview server key and its deployment was rebuilt successfully. Production
pipeline activation still requires merging the reviewed workflow, a GitHub
repository admin to configure its restricted environment/secrets, and a valid
Sentry upload token. The connected GitHub account has write access but the
environment API returned 403 for lack of admin rights. The existing upload
keystore has been recovered into restricted ignored local storage and its
certificate verified. Devin is used only as an IDE; cloud login and snapshots
are not required for this GitHub/Gradle pipeline.
