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
