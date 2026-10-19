# Partner Android release quality

Candidate **1.0.4** changes the native runtime. An OTA update cannot apply these changes to an older binary.

## Current readiness — 19 October 2026

The local ARM64 release build and automated checks pass. **The local AAB is not ready for Play upload:** it uses a debug signing key and version code 1. A production-signed, all-ABI build with the next EAS version code and device validation remain required. No candidate 1.0.4 bundle has been uploaded to Play or analysed by Google.

## Implementation

`plugins/withAndroidReleaseQuality.cjs` runs during Expo prebuild:

- Pins AGP 9.0.1, uses optimized ProGuard defaults, and enables R8 shrinking, optimization, obfuscation, and optimized resource shrinking. Library JNI/reflection consumer keep rules remain intact.
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

The verifier checks packaged DEX, AGP version, a nonempty obfuscation mapping, R8 optimizer flags, and optimized resource shrinking in the bundle metadata. A locally calculated renamed-class percentage is **not** the Google Play score. CI runs ten release checks (six configuration/API policy tests and four artifact-gate cases), Expo prebuild, and the native ASM transformation test. The artifact cases reject missing R8 metadata, disabled optimized resource shrinking, and an older AGP version.

For native plugin tests after Android prebuild, from `apps/partner`:

```sh
./android/gradlew -p android/buildSrc test --no-daemon --max-workers=2
```

## Verified candidate result

The isolated generated project in ignored `apps/.partner-release-audit` uses copied entry files, source links to Partner, a single ARM64 ABI, and debug signing. Keep its entry and NativeWind stylesheet resolution consistent. Sentry upload is disabled only for local validation; production monitoring guards remain enabled.

- `bundleRelease` passed in 25m 36s (970 tasks), including JS/source maps, ASM instrumentation, R8, native compilation, release vital lint, and bundle packaging.
- All ten release checks pass, including six configuration/API policy tests with API 24–36 fixtures and four artifact-gate cases. The ASM JVM test, TypeScript, ESLint, patch applicability, and scoped whitespace checks pass.
- Bundle metadata confirms AGP 9.0.1 and R8 shrinking/optimization/obfuscation enabled, with `resourceOptimization.isOptimizedShrinkingEnabled=true`.
- Mapping: 8,878/10,253 classes renamed (86.6% local count). R8 no-obfuscation/no-optimization/no-shrinking statistics: 20.03/20.58/19.97. These are not a confirmed Play score.
- The compiled reload image loader references Glide and bounded dimensions, with no `BitmapFactory`, `decodeStream`, or `URLConnection` reference.

Local evidence under `apps/.partner-release-audit/artifacts/`: `release-1.0.4-retry-build.log`, `release-1.0.4-verification.txt`, `pr-native-policy-tests.log`, and `reload-image-bytecode.txt`. These generated files are not committed.

The earlier 1.0.3 build was smoke-tested on an Android 14 phone for launch, keyboard/Continue accessibility, rotation, and background recovery. **That does not validate the new 1.0.4 native changes.** No phone is currently connected; physical testing was deferred by the user.

## Before Play upload

1. Build EAS profile `production` using the existing production environment/signing credentials, all configured ABIs, and automatic version-code increment. The previous cloud attempt was refused because the monthly Android quota was exhausted (reset 1 November 2026). It advanced the remote counter to 14 without producing a build; use the next available version code. Do not upload the local debug-signed ARM64/code-1 validation AAB.
2. Run the artifact verifier against the actual production AAB. Retain mapping and production Sentry symbols.
3. Test the new release on Android 15+ and a large screen: system bars, image picker/cropper, sheets, maps, keyboard, rotation, and split-screen. Validate authenticated orders, notifications, and transactions with a test account.
4. Upload to the normal Play internal-testing track and inspect Google's analysis for this bundle. Repository/build success does not clear warnings attached to release 13.

Release notes are in `release-notes/1.0.4.txt`. No candidate production upload or Google Play publication has been performed.
