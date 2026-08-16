# 04 — Admin Dashboard

Founder-only internal ops tool. Next.js, web — **the only web surface in the product**. Maps to `docs/BUILD-PLAN-Flikk.md` Weeks 7-8.

## Depends on

- [`../00-foundation/`](../00-foundation/README.md)
- Working slices of [`../02-partner-app/`](../02-partner-app/README.md) and [`../03-rider-app/`](../03-rider-app/README.md) — admin has nothing to onboard/monitor/assign without stores and riders existing in the other apps' flows. Store/rider onboarding (A1/A2) should land early enough (Week 7, per build plan) to unblock real onboarding before Week 9.
- [`../05-platform/realtime.md`](../05-platform/realtime.md) — cross-app order monitor.

## Contents

| File | Covers |
|---|---|
| [`screens.md`](screens.md) | Full screen inventory A1-A4 |
| [`flows.md`](flows.md) | Onboarding, monitoring, assignment, payout journeys |
| [`api.md`](api.md) | Endpoint usage per screen |

## Definition of done

Matches Week 8 exit criteria: A1-A4 built, plus a full 10+ run cross-app integration test — place a real order in the customer app → confirm it appears in partner app → mark packed → confirm admin can assign a rider → confirm rider app shows the assignment → mark delivered → confirm customer sees "delivered." This is the week most likely to surface integration bugs unit-level work hides — don't skip the repetition, one clean pass isn't sufficient confidence.
