# Customer content and app updates

## Content edited in Admin

Home Sections controls shelf order, visibility/schedules, title/subtitle, background,
product selections and the horizontal (7 cards) or grid (6 cards) layout for supported
product shelves. Supported shelves now accept an optional HTTPS 4:1 banner; clearing
it removes the artwork (preorders restore their bundled default). Structural sections
such as Quick categories keep their existing renderer. Home tabs/tiles, managed tab
content, festival/seasonal artwork and App content continue using their existing editors.
This does not let an administrator introduce a new native feature or screen.

Deploy the backend migration `20261111120000_home_product_banners.sql` before the
updated Admin editor. It only widens the existing banner constraint; no records are
removed. Stage and back up the database using the project's approved migration runner.
The mobile renderer must reach customers in the baseline release before they can see
new generic shelf banners. Older app versions continue showing their existing shelves.

The customer keeps public Home/catalogue queries in the existing account-scoped cache.
Successful queries are retained for up to 24 hours across launches. The network refreshes
stale data; shared realtime invalidation refreshes layout, artwork and product picks.
Invalid Home section responses throw, retaining the last good layout. Missing initial
configuration uses the bundled layout; invalid optional images do not hide products.
Checkout totals/availability always remain server-validated; cached content is not a quote.
Private orders, addresses, payment state and pending mutations are never restored by
this cache. Account changes discard the snapshot.

## One-time activation (not performed by this code change)

1. Review/merge this branch and apply the migration through the approved runner.
2. Create GitHub environments `customer-ota-preview` and `customer-ota-production`,
   restricted to `main`. Require a human reviewer for production. Supply `EXPO_TOKEN`
   through approved secret storage and the customer `EXPO_PUBLIC_SENTRY_DSN` variable.
   Never put credentials in source or workflow inputs. Use the project's required secret
   workflow when provisioning access. No signing keystore is used by OTA jobs.
3. Verify Expo project `a98e9f05-620b-4efb-8624-99d724667e7c` has separate `preview` and
   `production` channels pointing to separate branches. Configure its production EAS
   environment with the live public app settings. Preview here deliberately tests the
   same live backend, not sandbox checkout; use reviewer accounts and guarded tests.
4. Build/install new native baselines. Android's existing GitHub release workflow now
   accepts `update_channel` and the exact `previous_native_build_commit`. Build one
   preview-channel binary for QA and a production-channel binary for the store from
   the same reviewed source. The iOS preview EAS profile already uses `preview`; the
   local App Store archive uses `production` by default. Both must have the same
   native modules and Google Maps capability. Before any local iOS archive, run:
   `OTA_PLATFORM=ios OTA_NATIVE_BUILD_COMMIT=<previous-native-source-sha> node scripts/ota/native-release.cjs`
   from `apps/customer`, as well as the existing iOS release verification.
5. The new runtime IDs intentionally differ from previously uploaded 1.0.4 builds.
   This setup cannot safely update those older binaries. Publish/test the new baseline
   through the stores first and record the exact source SHA from its release report.

## Publish a compatible fix

1. Keep native modules/configuration unchanged. Merge reviewed JavaScript/assets changes.
2. Run **Customer OTA Update** on `main`, choose one platform and `preview`, and supply
   the full 40-character SHA of the native build actually installed on the test device.
   Do not substitute the latest repository SHA for the installed build's SHA.
3. The job compares native inputs, runs TypeScript/lint/tests, exports a production
   bundle and verifies its platform and live API before publishing to Expo preview.
4. On the matching preview-channel installation, check launch, login, Home content,
   Maps, cart, UPI cancellation/return and foreground/background behavior. Confirm the
   actual OTA update ID on-device; a local development build is not this test.
5. Run the workflow for `production` on the same source commit with that successful
   preview run ID, its successful exact-device QA run ID and the device-test checkbox. The job verifies the preview workflow,
   source SHA, platform, native baseline and runtime, then **republishes that exact Expo
   group**. It does not rebuild a different production bundle. Preserve environment
   reviewer rules; the checkbox records the operator's test assertion, not automated proof.

No new Expo builds or store submissions happen in this OTA workflow. It is manual only,
so pushes do not automatically spend deployment minutes or update customers. GitHub
execution and Expo update delivery remain subject to their respective usage plans.
Updates use expo-updates' existing launch behavior; no new forced reload was added.
A running checkout/tracking screen is not restarted by this implementation.

## Native compatibility and store releases

`native-runtime.json` defines distinct Android/iOS runtime IDs. Increment the affected
ID whenever native SDKs, dependencies, permissions, plugins, native source or native
artwork change. The Android native build guard refuses a changed native inventory with
an unchanged ID compared with the selected previous native build. Run the same guard
for local iOS archives. Keep the versionCode/build number rules too; runtime IDs do not
replace store version numbers.

The OTA guard uses a conservative source inventory (lockfiles, packages/shared, native
modules, native artwork, plugins/config and patches). Some shared JavaScript/dependency
changes therefore require a new baseline even when they could theoretically be OTA-safe.
Normal customer screen code and JavaScript image assets are permitted. The guard relies
on the operator selecting the real installed native build's commit and using the same
native build environment; it is not a substitute for installing/testing the exact binary.
Neither a legacy runtime nor an unmerged, mutable ref such as `main` is accepted as a
native baseline. Never publish a new runtime to try to patch an incompatible old binary.

## Recovery

Each successful run retains a non-secret `ota-report.json` with source/build SHAs,
native digest, platform, runtime and Expo update group for 90 days. Preserve reports in
release records. For an incident, stop promotion and use Expo's authenticated rollback
process to republish the last verified compatible group to the same channel/runtime,
or roll back to that binary's embedded bundle. Rollback is not automatic; use the guarded workflow described below. Test it on
preview first; do not delete updates or change channel mappings as a substitute.

Official references:
- https://docs.expo.dev/eas-update/runtime-versions/
- https://docs.expo.dev/eas-update/deployment/
- https://docs.expo.dev/eas/cli/

## Download and installation safety

`src/features/app-updates` owns the download-only lifecycle. After first paint, it
checks while the app is active and online, with a small startup delay, coalesced
requests, a four-hour success cooldown and a short failure cooldown. It does not
run an OS background service or add a new native dependency. Updates and rollback
manifests download without an update modal and without blocking navigation.

There is intentionally **no reload/install method** in the adapter and no
`Updates.reloadAsync()` call. Cached bundles are selected by expo-updates on the
next cold launch. Returning from a UPI app, resuming checkout, tracking an order,
logging in/out or navigating cannot trigger an OTA restart. Native error recovery
remains enabled for a failed launch. The native setting changed to
`ON_ERROR_RECOVERY` with zero startup wait, so these guarantees require the new
baseline binary; older already-installed binaries keep their native settings.

## Exact physical-device evidence

The preview app shows IDs in Profile → About Gloceries → Preview build and emits one
`GLOCERIES_OTA_QA` log with source SHA, platform update UUID,
runtime, channel and embedded/emergency flags. Use that log from the **installed
preview binary**, not a local Metro session. Only model labels are recorded; do not
supply phone numbers, names, serial numbers, UDIDs or payment details.

1. Publish preview, install the corresponding preview-channel baseline and cold
   launch until the log's update UUID matches `ota-report.json` from that run.
2. On that physical Android phone or iPhone, test launch/login, Home/Maps,
   cart/checkout, UPI cancellation/payment return and tracking/background-resume.
   Use guarded reviewer/sample flows. This process does not authorize a charge.
3. Run **Customer OTA Device QA**, supplying the preview run ID, platform, installed
   update ID/runtime, model, and this completed-check list:
   `["launch-login","home-maps","cart-checkout","payment-return","tracking-resume"]`.
   Confirm the physical-test checkbox only after testing. The workflow verifies the
   preview provenance and exact identifiers and saves `device-qa.json`.
4. Supply that successful QA run ID as well as the preview run ID to production
   promotion. An Android report cannot authorize iOS (or vice versa). A wrong update,
   runtime, failed workflow or incomplete checklist blocks promotion.

The artifact is an auditable operator/runner attestation, not proof that GitHub
remotely controlled the phone. Each platform needs its own real-device test. The
existing automated customer/OTA suites run before preview publication and promotion.

## Source identity and Sentry

Native GitHub builds and preview exports set `EXPO_PUBLIC_SOURCE_COMMIT` to their
source SHA. For a local iOS archive, set it to `git rev-parse HEAD`; the release
verifier rejects mismatches. App config embeds that public metadata. Sentry keeps
its native release/dist and debug-symbol association, with additional validated tags:
`app_source_commit`, `expo_update_id`, `expo_runtime`, `expo_channel`,
`expo_embedded` and `expo_emergency`. These survive the existing privacy filter;
customer/contact/location/payment payloads remain excluded.

Publication and rollback reports now record both source/workflow SHAs and the
platform update UUID, plus runtime/native digest and Expo group. Reports and QA
artifacts are retained for 90 days; preserve approved release records beyond that
window using the organization's approved storage. Rollback republishes original
JavaScript, so the app/Sentry source tag correctly remains the original source SHA,
while the running update UUID and workflow audit record identify the rollback.

## Tested rollback workflow

The rollback validators and download lifecycle have automated regression coverage
for mismatched runtimes/platforms/targets, untrusted or failed workflow evidence,
incomplete QA, offline downloads and rollback-to-embedded directives. A real
preview rollback rehearsal is still required before a production rollback:

1. Choose a successful known-good **Customer OTA Update** run. For production,
   choose one that was previously published to production for this native runtime.
2. Run **Customer OTA Rollback** with channel `preview`, the installed native source
   SHA, platform and target release run ID. It verifies provenance and native
   compatibility, then republishes the existing group without rebuilding.
3. Cold launch the matching preview installation, verify the newly assigned update
   UUID and complete **Customer OTA Device QA** on this rollback preview.
4. Run **Customer OTA Rollback** with channel `production`, the same target and
   native baseline, the preview rollback run ID and its device-QA run ID. Wrong
   evidence or a different target is rejected. Production and preview publication
   share concurrency locks with rollback to avoid competing writes.
5. Confirm the rollout report and Sentry tags on a new launch. A running customer
   checkout/tracking session is never force-restarted by this workflow.

A rollback changes JavaScript/assets, not database schema, native SDKs or payment
state. Backend/native regressions require their own reviewed recovery/store release.
If GitHub evidence artifacts have expired, do not substitute unrelated evidence;
recover approved release records and re-establish a verified preview first.

Before the first feature OTA, publish the already-tested baseline JavaScript through
preview/QA/production as a no-change checkpoint and retain that production report.
This provides a known-good group even for the first later rollback. Native early-crash
recovery can still fall back to the embedded bundle. Do not delete that embedded
fallback or override update URLs to bypass runtime checks.

The Android AAB verifier now checks the **packaged** update policy and zero startup
wait. The iOS archive privacy verifier also reads the app bundle's sibling `Expo.plist`
and verifies policy, runtime, channel and project URL. Run it against the compiled
`.app/Info.plist`, not a source plist before resource copying.

Build/export guards also reject uncommitted app-source changes. This prevents a local
iOS archive or update from being labeled with a Git SHA that does not describe the
code actually bundled. Keep generated native outputs and release artifacts in their
existing ignored output locations, and commit reviewed source before a release.

For the first preview check, leave the app active and online long enough for the
idle download to finish, then fully close and reopen it. Merely switching apps or
returning from UPI is not a cold launch and intentionally does not apply the update.
Verify the actual ID in the preview panel; do not infer installation from elapsed time.
