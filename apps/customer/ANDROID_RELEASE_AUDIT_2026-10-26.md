# Customer Android production audit

Target: Gloceries 1.0.4, Android version code 11, package com.gloceries.customer.

## Verified before the build

- Play Console Latest releases and bundles confirms the highest uploaded customer code is 10 (1.0.3); production is still a draft.
- GitHub customer-android-production has all six expected signing/Maps/Sentry secret names and five required public variables. API URL is https://api.gloceries.com; Sentry is gloceries/customer-app. Secret values were not read.
- API DNS resolves to the Lightsail static IPv4 15.252.56.122. HTTPS service health, database-backed app configuration, payment availability and catalogue GETs return 200. Online/COD/UPI are advertised; 44 provider netbanking banks are returned.
- Supabase gloceries-mumbai (ap-south-1) is ACTIVE_HEALTHY. All recorded source migration hashes match. Applied the one missing existing migration, 20261023150000_rider_drafts_server_only.sql, and verified revoked client grants and removal of the old self-write policy. No customer rows were changed.
- Customer regression: 44 suites / 276 tests passed; TypeScript and lint passed. Backend: 205 suites / 1,284 tests, build and lint passed. Initial backend attempts were blocked by local sandbox write permissions, then passed with the correct checkout permissions.
- The release verifier now rejects staging APIs, the wrong Sentry project, cleartext traffic, debug bundles, an old target SDK, unexpected sensitive permissions, wrong upload certificates and incompatible 64-bit native libraries. It checks actual ELF LOAD/RELRO layout and AAB 16 KB ZIP alignment, not just toolchain settings. Final artifact results remain pending the GitHub build.
- The public privacy page loads in Chrome. Its stale Cashfree checkout reference is corrected to Razorpay in this PR's reviewable source; it has not been published by this audit.

## Remaining release gates

- Run the main-only GitHub release workflow for code 11 / highest 10 after this reviewed source is merged. Download and verify the resulting signed AAB and logs.
- Play Publishing overview specifically flags marketing illustrations instead of real in-app screenshots. Replace them with genuine Android captures before review; do not dismiss the warning with Proceed anyway. ADB detected no Android phone during this audit.
- Test the exact signed Android release on a device/Play internal track, including real-account OTP, Maps, process restart, closed-store behaviour and payment handoff. Automated mocks do not establish those outcomes.
- The earlier sandbox refund job received provider HTTP 400 and still needs diagnosis; do not change its idempotency key/body or mark it refunded without provider acknowledgement. No live charge/refund was created during this audit.
- The primary images.gloceries.com image renders in Chrome. Command-line image/legal probes returned HTTP 403 while actual browser pages/images loaded, so those probe responses alone do not establish an outage. The allowlisted API image recovery returns WebP 200; verify both paths on the exact Android release.
- Push delivery, webhook delivery/reconciliation, current Sentry errors, dependency findings and Play listing/data-safety/reviewer access need exact release verification. Supabase advisors still report seven mutable-function-search-path warnings and disabled leaked-password protection; server-only tables without client policies are intentionally deny-by-default, not a reason to open access.
- No Play review submission, rollout, changed declarations or production order/payment is authorized by this build audit alone.

## First main-branch build and compiler patch

- GitHub run 40272125508 used reviewed main commit 8923dfa6 for 1.0.4 (11). Validation passed, as did Sentry authentication and production API/database/payment availability probes. Native compilation failed at :app:minifyReleaseWithR8 with StringIndexOutOfBoundsException: String index out of range: 0. No verified AAB was produced or uploaded to Play.
- The error matches Google's optimized resource shrinking issue 447076894. Pin the published stable R8 8.12.30 patch through the documented settings pluginManagement buildscript override, while retaining AGP 8.12.0, minification and optimized resource shrinking. A Gradle task rejects any different loaded compiler version; workflow stack traces are enabled. A minimal real Gradle project with AGP 8.12.0 successfully loaded and verified R8 8.12.30. Actual rebuilt AAB verification is still required.
- Patch validation: all 44 customer suites / 277 tests and lint pass. A real Expo Android prebuild without local dotenv files confirms the generated settings and compiler guard.
- The physical Android phone is connected. Its installed Play app is still 1.0.3 (10), so it has not verified the new release.
- Play's saved Data safety answer claims data is automatically deleted within 90 days without account deletion. No supporting automatic retention job was established in this audit; verify/correct that answer with the account owner before submission. No declaration was edited.

## Production permission and Play draft cleanup

- The generated dependency manifest requested SYSTEM_ALERT_WINDOW and legacy READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE. The customer has no corresponding overlay or shared-storage feature. Production config now blocks those permissions, while development config remains unchanged; the packaged-AAB verifier rejects them if reintroduced. Regenerated production manifest entries use tools:node=remove. All 44 customer suites / 278 tests and lint pass. The final AAB still needs to be rebuilt from this source.
- Owner approved India-only production availability; saved as a pending Play publishing change, with no submission or rollout.
- Owner confirmed partial data deletion through support and approved the new public /delete-data instructions. PR #85 is merged, its Vercel landing deployment passed, and the published URL loaded in Chrome. Play Data safety draft now has Yes selected for support-based data deletion with https://gloceries.com/delete-data; saved successfully. The unsupported 90-day automatic deletion answer is deselected.


## Customer data minimization requested by owner

- Removed the birthday UI, picker state, profile model, client mutation field, native date-picker dependency and Expo plugin. The profile API returns no birthday and accepts only a bounded non-empty name; unexpected fields fail before a database write.
- Forward migration 20261026063056_customer_email_support_privacy.sql removes users.birthday and updates the existing account-deletion function first. Historical migrations are immutable. Deploy the name-only backend before applying this schema migration; the current backend still selects the retired column.
- Customer Help & support now opens a user-controlled mailto composer, using the configured valid support email or hello@gloceries.com. Only a selected order reference is prefilled; no message body, phone, location or token is attached. No support API requests, ticket form or conversation route remain. Guests can access support and FAQ. A failed email handler shows the selectable support address and clear manual instructions.
- Old customer support endpoints return HTTP 410 after auth; they no longer import the database or create messages. The migration disables create_customer_ticket and blocks new customer ticket/message inserts while preserving historical conversations and partner/rider support. Email correspondence remains in the support mailbox; this is not a claim that emails are never retained.
- Dispatch offer previews contain an approximate delivery area (coordinates rounded to two decimals), without the address, landmark or instructions. The exact address/pin remains in the assigned rider's active delivery response, scoped by rider_id. Completed/cancelled/failed rider history removes the address, in addition to existing phone redaction. Backend/cloud and Google Maps/geocoding providers still process location for fulfilment; do not declare that all location goes only to a rider.
- Coarse Android/reduced iOS location permission is no longer presented as precise GPS. The user can open Settings or choose a delivery pin manually. Existing fresh-fix checks, Google Maps provider selection, accuracy halo and confirmed-pin logic remain.
- Public privacy/account-deletion copy reflects the removed customer birthday, email support and delivery-location access. No existing support records are purged as part of this change.
- Validation: customer 45 suites / 284 tests; backend 208 suites / 1,291 tests; customer/backend TypeScript and lint pass. An isolated PostgreSQL 17 instance successfully rebuilt all 144 canonical migrations. Customer privacy, partner/rider support and account-controls SQL regression checks pass. Landing TypeScript and targeted lint pass.
- Prior build 40277433416 from 089c4fb5 succeeded but predates these changes. Do not upload it as the data-minimized release. Build the replacement on the exact merged source.
- Remaining gates: exact signed Android device testing and genuine Play screenshots; accurate Google Maps/Sentry diagnostics and identifier disclosure; previously recorded refund/push/payment reconciliation checks. No review submission or rollout has occurred.


## Sentry performance-event location privacy follow-up

- Review of Sentry's SDK data documentation confirmed that request URLs/query strings can be retained by performance instrumentation. The previous beforeSend callback protected crashes only; performance transactions bypassed it. This is inconsistent with minimizing delivery coordinates outside fulfilment/map processing.
- Apply one sanitizer through both beforeSend and beforeSendTransaction. Remove request/extra/breadcrumbs, span descriptions and arbitrary span attributes, and trace-context attributes. Preserve span timing/status/trace IDs and screen transaction names. Replace any user identity with a non-user IP placeholder to prevent default IP inference on these events; breadcrumbs are disabled. Existing error-text scrubbing remains.
- Regression payloads include exact synthetic coordinates, a delivery address, account identity and URLs. None remain after filtering. Customer TypeScript, lint and all 286 tests pass; an additional wiring regression test covers both callbacks. No new data collection or dependency is introduced.
- Cancelled superseded AAB run 40282752830 before any Play upload. Build from the final merged telemetry-fix source instead. PR #87's production backend deployment and database migration already passed; the customer birthday column is absent and both chat guards are enabled.
