# iPhone release preparation - 27 October 2026

The initial App Store launch targets iPhone only, at the owner's explicit request. iPad support must be enabled again only after tablet QA and genuine iPad screenshots are available. Verify the final archived `UIDeviceFamily` is exactly `[1]`; source configuration alone is not proof of the shipped device family.

## SDK privacy metadata correction

RazorpayStandard 1.5.3 contains the human-readable string `Email address` in `NSPrivacyCollectedDataType`. The official upstream 1.5.9 manifest was checked on 27 October and still contains that string. Apple requires `NSPrivacyCollectedDataTypeEmailAddress`:
https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatype

The Expo iOS config plugin installs a host-Swift build phase before app resource copying and framework embedding. It corrects only this exact known label in RazorpayStandard's manifests. It preserves every declared purpose, identity-linkage flag, tracking flag, and unrelated property. It does not alter payment code, hide collection, or make broad dependency changes.

The Swift checker rejects unknown collection identifiers, is idempotent, and can verify all manifests in the final app bundle without modifying them. Xcode re-signs the embedded framework as part of the normal app signing process; the final app signature must still pass strict verification.

## Validation performed

- Customer suite: 48 suites / 293 tests pass. Existing non-fatal React `act` warnings in an order-rating test remain visible.
- Swift self-test passes: declaration preservation, idempotency, and rejection of unknown identifiers.
- Expo prebuild and existing native dependency installation succeed.
- Generated main app Debug and Release settings target device family 1.
- Generated privacy build phase precedes resource copying and framework embedding; CocoaPods' manifest-lock check may correctly precede it.
- Native purpose-string verifier passes.
- After the precise correction, all 29 manifests found in the installed Pods tree pass identifier validation. This is not a final archive verification.

## Required final artifact checks

1. Archive the committed source as 1.0.4 (4), with the live HTTPS API, native Google Maps, production update channel and customer-app Sentry settings.
2. Validate all purpose strings, `UIDeviceFamily`, packaged endpoint, SDK privacy identifiers, application signature, application dSYM and production export entitlements on the actual archive/IPA.
3. Preserve and report any unavailable vendor dSYMs; do not claim complete native symbol coverage based only on the application dSYM.
4. Upload the replacement to TestFlight and verify its processing result and exact installed version before signed-in map/payment/recovery/notification testing.
5. Complete genuine iPhone screenshots, App Store metadata, age rating, India availability and reviewed App Privacy responses before submission. Historical refund/webhook/CDN gates remain separate from source tests.

No App Review submission or public-release readiness is implied by this document.
