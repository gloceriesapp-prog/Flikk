# 2026-10-15 — Rider hardening, partner deletion, live tracking

No database migrations. Backend deploys with the merge; the rider app needs a
new EAS production build (native config changed: Sentry, notification
channel). Partner and customer changes are JS-only but ride the next build.

## What changed

| Area | Change | Why |
|---|---|---|
| Rider offer alerts | New Android channel `offers` (max importance, sound, long vibration, lock screen). Offers and assignments are pushed on it with typed data. A push while the app is open refreshes offers at once; tapping opens the assigned order, also from a cold start. Presence/offer ping 45s → 20s, with an in-app vibration for new offers. | Riders were missing orders. |
| Live tracking | `GET /orders/:id/rider-location` and `GET /trips/:id/rider-location` (owner only, out-for-delivery only, stale after 180s, no rider identity). Customer track screen shows a live map card, polled every 10s. Rider reports position every 10s while carrying an order. | Customers expect to see the rider. |
| Sign-out | `DELETE /auth/push-token` (staff roles); registering a token removes it from every other account. Rider sign-out also goes offline and wipes cached orders. | Shared phones got the previous rider's pushes and customer data. |
| Order history | Rider history is pulled from `GET /rider/assignments` once per session and merged with the local cache. | History was lost on reinstall. |
| COD cash limit | `RIDER_CASH_LIMIT` (default ₹2000, `0` = off). A rider holding unsettled cash can't accept a cash order that takes them over it (409 `CASH_LIMIT_REACHED`); prepaid orders and admin assignment are not gated. Offers carry `cash_limit_blocked`. `GET /rider/cash-balance` adds `limit` and the unsettled collections; Earnings shows a cash-in-hand card. | Cash leakage. |
| Customer phone | `GET /rider/assignments` returns the customer phone only while the order is live; finished orders are stored on the phone without numbers. | Privacy. |
| Rider crash reporting | Sentry, same scrubbing as partner/customer; ErrorBoundary reports caught render errors. | Crashes were invisible. |
| Partner deletion | `GET/POST /partner/account/deletion-request` (store owners; refused with active orders; closes the store). In-app screen plus links on suspended/waiting screens; website section added. Shared ticket helpers with the rider flow. | Play account-deletion policy. |

## Verification (local, before push)

- backend: lint 0, `tsc` 0, vitest 155 files / 926 tests passed
- rider: `tsc` 0, eslint 0 errors (16 pre-existing warnings), 7 self-checks OK, Android `expo export` bundles
- partner: `tsc` 0, eslint 0 errors (8 pre-existing warnings)
- customer: typecheck 0, jest 15 suites / 54 tests passed; lint's one error is `react-native-razorpay` not installed in this container (CI installs it)
- landing: typegen, `tsc`, eslint 0 errors, `next build` OK

One regression found and fixed during the run: `tripDispatchRoutes.test.ts` mocked `pushNotifications.js` without the new `riderAssignmentPush` export.

## Ops after merge

1. Railway: optionally set `RIDER_CASH_LIMIT` (default 2000 applies without it). Confirm the new deploy is live.
2. EAS secrets for rider: `EXPO_PUBLIC_SENTRY_DSN` (and `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` for source maps).
3. Build a new rider production binary; bump the version if a 1.0.0 build is already installed anywhere.
4. Tell riders: cash above ₹2000 must be handed over before taking cash orders; settle it from admin → Cash on delivery.

## Not in this release

- Delivery proof photo, server-side arrival timestamps, and return-to-store after a failed delivery need migrations; they ship in a separate PR that waits for production migration approval.
- Background location still reports every 45s / 50m when the app is in the background; only the foreground cadence is faster during deliveries.
- Live selfie, RC/insurance in KYC, and incentives: deferred.
