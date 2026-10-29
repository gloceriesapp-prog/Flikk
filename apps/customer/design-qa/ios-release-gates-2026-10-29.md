# Customer iOS build 8 release gates

Build: 1.0.4 (8), source cc4bb88496208fc66139c15c204fb269d1a4067f. This report supersedes earlier launch-stability conclusions. Do not submit this build for review while the following blockers remain.

## Verified

- All three currently published product images returned HTTP 200, valid WebP bytes and Cloudflare HIT on two requests each. Cache policy is public, immutable, one year. This closes the current catalogue CDN check, not every future upload.
- Recovered genuine matching dSYMs for all nine previously missing vendor frameworks. The archive now has matching UUID and architecture coverage for all 19 embedded frameworks. The IPA was not modified.
- Sentry's debug-file API confirms storage of all nine recovered debug IDs in customer-app. Its upload CLI nevertheless reports processing errors for eight files. The signed-in Sentry issue CUSTOMER-APP-5 now visibly resolves React, Hermes and ExpoModulesCore native frames to function names and source lines; this provides actual symbolication evidence for those images. Symbolication of the other recovered frameworks still needs an event exercising their frames.
- Focused backend refund/notification tests: 33 passing. Focused customer checkout/recovery/UPI tests: 47 passing. Symbol discovery tests: 3 passing.

## Push credentials corrected; APNs receipt confirmed

The reviewer granted notification permission and the backend registered one device. Exactly one authorized test notification was queued, using the existing reviewer order as its navigation target without changing that order. The worker returned `Push rejected: InvalidCredentials`; no receipt is confirmed. Do not enqueue duplicates.

Read-only account inspection found no iOS credentials in Expo @nishal777/customer and no existing keys on the Apple team. The user then explicitly approved creating and securely transferring a dedicated APNs key. Created Gloceries Customer Push with APNs only, Production environment, Topic Specific restriction for com.gloceries.customer. Uploaded the existing downloaded key through the official EAS CLI (declining generation of another key), then assigned it to the customer project. No distribution certificate or App Store Connect API key was transferred.

The same previously authorized notification had exhausted six credential-error attempts. Re-enabled exactly one retry on that row, guarded by its ID, event, previous error, unsent state and absence of receipts. It was sent at 2026-10-29 09:25:06.9 UTC with no error. Its receipt subsequently became confirmed on the first receipt check, with no error. No second notification was enqueued. This verifies provider delivery to APNs; physical banner display and notification-tap navigation have not yet been observed. The subsequent phone capture shows Login, so signed-in tap behavior is still open.

The downloaded private key remains outside the repository with owner-only permissions. Its contents were never printed or committed. The Expo credentials page visibly confirms the saved key/team assignment.

## Native crash blocker

Two physical-device crash reports identify version 1.0.4 build 8 on 2026-10-29:

- 10:47:47: SIGABRT, Swift allocation failure during ExpoModulesCore Record reflection. App symbol lookup associates the record witness with Expo Updates ReloadScreenOptions. This does not establish the initiating call or root cause; no application source reload call was found.
- 10:50:58: SIGTRAP in CoreFoundation dictionary/property-list serialization reached from CFNetwork URL-cache storage.

Both reports show large virtual malloc regions. Virtual allocation totals alone do not establish resident memory use or a leak. The crashes must be reproduced with logs and diagnosed before choosing a fix. A successful unit suite does not clear this native release blocker.

Sentry independently records the allocation failure as CUSTOMER-APP-5 (issue 7817854438), release 1.0.4 (8), production, on iPhone 17 Pro / iOS 27.0.1. It also records four prior watchdog terminations as CUSTOMER-APP-4; their precise causes remain unverified. A runner memory sample reports 2769 MB, which warrants tracing but is not by itself a diagnosis.

### Candidate change and controlled comparison

The static live-location halo used a custom Google Maps marker with default continuous view tracking. It now permits its first layout/snapshot and disables tracking after 250 ms, with timer cleanup on unmount. GPS coordinate changes still move the native marker. Its size, color and single-circle appearance are unchanged. This removes unnecessary repeated snapshots; it is not yet proven to resolve the release crash.

Physical memory samples from the original installation were 345008 KB at Login, 2499728 KB with the map, then 2959024 KB after returning to Home. A temporary native-build-7 QA app containing the candidate source, with OTA disabled, measured 704512 KB at Home and 842544 / 813712 KB with the map at 09:51:31 / 09:53:25 UTC. The stable candidate samples are encouraging, but native-build/OTA differences prevent treating this as a conclusive A/B test.

The user approved replacing the local test installation, including possible local-state loss. Prepared two additional diagnostic variants from the same build-8 native archive, with identical development signing and OTA disabled: baseline retains the archive's original JavaScript; candidate embeds the current source. Neither changes the original archive or qualifies as an App Store artifact. Baseline was installed, but its later accessibility capture timed out and the screenshot was black with the microphone indicator. Its 399472 KB sample is excluded because map visibility was not verified. Resume the comparison when the phone is available; do not claim the crash fixed or submit a replacement based solely on the earlier samples.

Current source validation: 51 customer suites / 320 tests pass; TypeScript, focused ESLint and git diff checks pass. The location test verifies initial halo tracking, stopping after layout, and continued GPS movement with tracking off. Backend focused tests remain 33 passing; symbol collector tests remain 3 passing.

Follow-up: after resetting the stalled runner, the controlled native-build-8 baseline visibly opened Google Maps and measured 264672 KB at 11:18:42 UTC and 276128 KB at 11:20:00 UTC. Only one Gloceries process was present. The public production OTA endpoint returned HTTP 204 for the exact iOS runtime, so no remote update was available in that check. These baseline observations do not reproduce the prior unbounded memory growth and do not establish the halo as its sole cause.

A further packaging discrepancy was found: the temporary candidate's export was plain JavaScript, while the archive baseline uses optimized Hermes bytecode version 98. Earlier cross-variant memory comparisons are therefore not conclusive. Recompiled the candidate with the project's matching Hermes compiler (250829098.0.17, bytecode 98), verified its development signature, and continued the comparison with matching formats. The production archive/IPA remains untouched.

## Refund blocker

One guarded retry against the dedicated local database and Razorpay test key still returned HTTP 400 BAD_REQUEST_ERROR, `invalid request sent`. The captured sandbox payment is INR 63 and has no provider refund. The durable request retains its original idempotency key and frozen amount. Do not repeatedly retry, replace that key, or run a live refund without authorization. The current request shape matches the documented idempotent refund API, so a code defect has not been established.

Latest read-only recheck confirmed captured=true, amount=6300 paise, method=netbanking, and zero provider refunds; the local job was failed at six attempts. A subsequent diagnostic retry stopped at its local-database guard because Docker had shut down after the Mac disk filled. It did not reach the provider. Docker logs explicitly reported `no space left on device`; reinstallable caches were cleared, but the engine's restart controls remained stuck. User assistance reopening Docker is pending. No containers or volumes were deleted and no live refund was attempted.

Docker recovery subsequently succeeded after force-stopping only its already-stalled backend and starting the installed Desktop application. The dashboard and CLI report Engine running; existing database/storage volumes remain intact and the sandbox containers are healthy. The prepared guarded retry then reached Razorpay and again returned HTTP 400, BAD_REQUEST_ERROR, `invalid request sent`; source, step and reason were all NA. The provider supplied no x-razorpay-request-id header. No live refund was attempted. The remaining refund blocker is now the provider rejection, not Docker availability.

## Exact-build payment return

One pending INR 1 sample checkout is authorized, with no payment authorization, PIN or charge. It has not been created in this run. Resume only after addressing the observed native crashes. The earlier user-completed INR 1 payment from a temporary native QA build does not verify this exact TestFlight build.

## Symbol audit command

Before exporting another archive:

```sh
npm run verify:ios-symbols -- --archive /path/Gloceries.xcarchive --search-root ios/Pods --search-root /path/vendor-symbols --copy
```

The collector refuses mismatched UUIDs and exits unsuccessfully if any embedded framework lacks matching symbols. Preserve the actual vendor dSYMs rather than generating placeholder symbols from stripped binaries.

## Resumed physical checks and support escalation

The matching-Hermes native-build-8 candidate visibly opened Google Maps and measured 332896 KB resident memory at 2026-10-29 13:51:58 UTC. Reviewer sign-in succeeded. Two map openings were verified; synthesized panning produced a visible map change, but the accessibility tree cannot independently confirm the pan distance or recenter result. The third opening's accessibility wait timed out and is not counted as a pass. Returning to the location onboarding screen was visually verified. No new Gloceries crash reports were present after this test. This is a limited diagnostic result, not exact TestFlight verification or proof that the original crash is resolved.

Two earlier CPU-resource reports at 15:08 and 15:13 local time were also found. The latter reports 57% CPU averaged over 159 seconds, with no OS action taken. Matching Hermes dSYMs resolve the sampled stack to Runtime::drainJobs, generatorPrototypeResume and interpreter calls. These native frames do not identify the responsible JavaScript source or prove the map is the cause.

The signed-in Razorpay test dashboard independently confirms the INR 63 payment is captured with no refund. Its refund form exposes no actionable explanation for the API's generic rejection; no dashboard refund was submitted. After explicit user approval for the redacted diagnostic and existing support contact, Razorpay support ticket #21602384 was successfully created. Razorpay's confirmation estimates a status update in 4-8 business hours. No live financial action was performed.

Host storage fell below 300 MB free during testing. Further archive creation and large traces were held to avoid another disk-full shutdown. Rebuildable browser disk/update caches were selected for cleanup; release archives, original IPAs, source, signing keys and database volumes are preserved.
