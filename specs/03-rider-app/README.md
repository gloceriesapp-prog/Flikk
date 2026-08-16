# 03 — Rider App

Delivery rider's Expo (React Native) app — the simplest, most utilitarian of the three RN apps, used mid-route often with poor connectivity. Maps to `docs/BUILD-PLAN-Flikk.md` Weeks 6-7.

## Depends on

- [`../00-foundation/`](../00-foundation/README.md)
- [`../02-partner-app/`](../02-partner-app/README.md) — an assignment only exists once an order is packed and admin assigns a rider ([`../04-admin-dashboard/`](../04-admin-dashboard/README.md) A3); build partner before rider for this reason, matching the build plan's order.
- [`../05-platform/notifications.md`](../05-platform/notifications.md) — Expo Push for new-assignment alerts.

## Contents

| File | Covers |
|---|---|
| [`screens.md`](screens.md) | Full screen inventory R1-R5 |
| [`flows.md`](flows.md) | Assignment-handling journey |
| [`api.md`](api.md) | Endpoint usage per screen |

## Chicken-and-egg note

Per PRD risk mitigation: the rider app has zero users at launch. The founder personally serves as the first rider, validating the app end-to-end (this is the Week 8 cross-app integration test) before recruiting external riders in Week 9. Build and test this app assuming the first real user is the founder, not a stranger — the onboarding/training assumptions differ.

## Definition of done

Matches Week 7 exit criteria: OTP login with approval gate, assignment queue, assignment detail, mark-delivered flow, earnings/history, push notifications wired for new assignments, `rider_earnings` write-on-delivery working.
