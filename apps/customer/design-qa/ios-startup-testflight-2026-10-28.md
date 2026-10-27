# TestFlight startup regression - 28 October 2026

## Confirmed failure

The official TestFlight installation of customer 1.0.4 (4) was verified through CoreDevice. Launching it on the connected iPhone produced SIGABRT and `RCTFatalException: main has not been registered`. UUID-matching symbols resolve the final frames to Expo Updates error recovery. Build 4 must not be submitted for App Review.

The final archive source map contains separate customer and repository-root copies of React, React Native, Expo core, and Reanimated. This dependency topology is unsupported and can initialize separate application registries. The isolated release checkout uses linked dependencies, so limiting Metro's fallback search paths alone did not prevent hierarchical resolution from finding root packages.

## Correction and checks

- Resolve six process-wide runtimes from the customer's canonical dependency directory, retaining Metro's package exports/platform handling and Sentry/NativeWind resolver behavior.
- Check the actual generated release source map for exactly one copy of each runtime. The known failing build-4 map is rejected; the corrected local iOS export passes.
- Add a Release archive phase immediately after JavaScript bundling so duplicate runtimes fail the archive before distribution.
- Regression fixtures cover duplicate registries, missing evidence, and Expo's project-relative generated loader paths. Build-phase ordering and idempotence are checked.
- Customer automated checks: 49 suites, 298 tests passed; type checking passed. Lint passed.

## Required release verification

Replacement build 5 is being prepared. No claim of successful archive, upload, TestFlight launch, signed-in flows, payment/refund completion, push delivery, or App Review submission is made by this source change. The exact replacement TestFlight build must pass physical-device testing. Historical refund, CDN, push, and missing vendor-symbol limitations remain separately tracked.
