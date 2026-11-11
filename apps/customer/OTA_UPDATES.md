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
   preview run ID and the device-test checkbox. The job verifies the preview workflow,
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
native digest, platform, runtime and Expo update group for 30 days. Preserve reports in
release records. For an incident, stop promotion and use Expo's authenticated rollback
process to republish the last verified compatible group to the same channel/runtime,
or roll back to that binary's embedded bundle. Rollback is not automatic. Test it on
preview first; do not delete updates or change channel mappings as a substitute.

Official references:
- https://docs.expo.dev/eas-update/runtime-versions/
- https://docs.expo.dev/eas-update/deployment/
- https://docs.expo.dev/eas/cli/
