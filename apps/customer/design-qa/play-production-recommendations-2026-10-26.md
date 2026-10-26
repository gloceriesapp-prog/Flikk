# Play production recommendations - 2026-10-26

Reviewed artifact: customer 1.0.4 (11), source cba2c284a14b331bac70d30449a4c20403cc9f20.
Play production remains in review. No public rollout performed.

## Four recommendations

1. Edge-to-edge APIs: Play names React Native StatusBarModule/WindowUtilKt and Razorpay BaseCheckoutActivity. Customer source does not set deprecated status/navigation bar colors. Keep edge-to-edge enabled; vendor migration and API 35/36 safe-area testing remain required. Do not patch payment SDK bytecode or suppress warnings to imply a fix.
2. Orientation/resizing: MainActivity was portrait-locked. The config plugin now removes only the customer activity lock and enables resizing. Final AAB verification rejects a locked, missing or non-resizable customer activity. iOS orientation and third-party checkout declarations remain unchanged. New native build, rotation/tablet and checkout tests are still required; this source change is not present in uploaded code 11.
3. Bitmap optimization: exact mapping resolves H4.l to APNG StillFrame, S2.a to Fresco ArtDecoder, S4.k to WebPDecoder, W2.e to SimpleImageTranscoder, h7.k to Google Maps KmlRenderer, s1.r to Glide DrawableToBitmapConverter. Download paths N.l/Vb.d resolve to AndroidX ReplyRunnable/Kotlin BuiltInsResourceLoader. AppImage already uses expo-image memory/disk caching, backed by Glide with downscaling enabled. No customer-written BitmapFactory network decoder found. This bundled-library/static-analysis recommendation is not cleared by the orientation change.
4. R8: Play specifically requests AGP >= 9. The uploaded build already uses R8 8.12.30, minification and optimized resource shrinking, verified in the artifact. SDK 57's AGP 8.12 toolchain cannot simply be replaced without migration/testing; SDK 58 adds compatible Expo module tooling. A separate framework migration is needed, not a blind release-time version override.

## Live payments

Owner approved boolean-only verification of existing Lightsail credentials despite the unavailable aws-secrets-manager skill. Production API and worker containers both report live mode, a live-prefixed configured key, secret present, webhook secret present, and online payments not disabled. A read-only request from the API container to Razorpay GET /v1/orders?count=1 authenticated successfully (HTTP 200). No key values or customer transaction details were displayed/copied, and no credentials were changed.

Public /payments/availability returns online=true, cod=true, upi_intent=true. No production payment or refund was executed. Existing local sandbox refund HTTP 400 remains unresolved; it must not be retried using live credentials or treated as proof of live refund failure/success. Read-only authentication does not verify checkout capture, webhook reconciliation or refund completion.

## References

- https://developer.android.com/about/versions/15/behavior-changes-15#edge-to-edge
- https://developer.android.com/about/versions/16/behavior-changes-16#large-screens-form-factors
- https://developer.android.com/topic/performance/vitals/code-optimization
- https://github.com/expo/expo/issues/49550
- https://expo.dev/changelog/sdk-58

Recommendations are distinct from blocking review errors. Approval and exact-artifact checkout/refund/webhook/push validation remain separate release gates.
