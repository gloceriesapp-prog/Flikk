# 01 — Customer App

Public-facing Expo (React Native) app. The showcase surface — see [`../00-foundation/design-system.md`](../00-foundation/design-system.md) for tone. Maps to `docs/BUILD-PLAN-Flikk.md` Weeks 2-4.

## Depends on

- [`../00-foundation/`](../00-foundation/README.md) — full data model, auth, API conventions, design tokens must exist first.
- [`../05-platform/payments.md`](../05-platform/payments.md), [`../05-platform/realtime.md`](../05-platform/realtime.md), [`../05-platform/notifications.md`](../05-platform/notifications.md) — checkout, live tracking, WhatsApp updates.

## Contents

| File | Covers |
|---|---|
| [`screens.md`](screens.md) | Full screen inventory C1-C11, purpose, state variants |
| [`flows.md`](flows.md) | End-to-end user journeys |
| [`api.md`](api.md) | Which endpoints each screen calls |

## Reference

[Clickable prototype](https://claude.ai/code/artifact/5e469049-797c-41c8-ae8b-447bf1929f63) — screens C1-C11 are built and clickable there. Treat it as the visual reference; this spec folder is the behavioral/functional reference.

## Definition of done

Matches `docs/BUILD-PLAN-Flikk.md` Week 4 exit criteria: feature-complete and stable, 10-15 real orders run through the full flow by the founder before partner/rider work begins. Don't carry customer-app bugs forward into later weeks.
