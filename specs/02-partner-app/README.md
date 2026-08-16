# 02 — Partner App

Store owner's Expo (React Native) app — a tool checked between serving walk-in customers, not a showcase. See [`../00-foundation/design-system.md`](../00-foundation/design-system.md) tone guidance. Maps to `docs/BUILD-PLAN-Flikk.md` Weeks 5-6.

## Depends on

- [`../00-foundation/`](../00-foundation/README.md)
- [`../01-customer-app/`](../01-customer-app/README.md) — orders must exist for a queue to have content, though this app can be built in parallel once the backend order endpoints exist.
- [`../05-platform/notifications.md`](../05-platform/notifications.md) — Expo Push for new-order alerts.

## Contents

| File | Covers |
|---|---|
| [`screens.md`](screens.md) | Full screen inventory P1-P6 |
| [`flows.md`](flows.md) | Order-handling and catalog-management journeys |
| [`api.md`](api.md) | Endpoint usage per screen |

## Ponytail note (from the build plan, worth repeating here)

This app's navigation/data-fetching patterns should closely mirror the customer app's — same Zustand + TanStack Query approach. Don't invent a different pattern just because it's a different app; consistency across the three RN apps matters more than perfecting any one of them (`claude.md`).

## Definition of done

Matches Week 6 exit criteria: OTP login with approval gate, order queue with accept/pack/ready actions, catalog CRUD, weekly payout view, push notifications wired for new orders.
