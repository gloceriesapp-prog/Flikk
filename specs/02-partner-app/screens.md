# Partner App — Screens

## Purpose

Full screen inventory for the partner (store owner) app. Bottom-tab structure: Orders / Catalog / Payouts.

## Screen inventory

| # | Screen | Purpose | Key state variants |
|---|---|---|---|
| P1 | Login (OTP) | Store owner auth | New store (pending approval) / active store |
| P2 | Order queue (home) | Incoming orders needing action | Empty / new order (needs accept) / accepted, needs packing |
| P3 | Order detail | Item list for one order, mark packed | Packed action taken / already packed |
| P4 | Catalog management | Add/edit products, toggle stock | Item list / add-new-item form |
| P5 | Payouts | Weekly settlement summary | Current week pending / past weeks history |
| P6 | Store settings | Hours, store info | — |

## Notes per screen

- **P1 (Login):** pending stores (`users.is_approved = false`) see a "waiting for approval" state instead of the app shell — not a locked-down version of the real app, a genuinely separate minimal screen. See [`../00-foundation/auth-and-roles.md`](../00-foundation/auth-and-roles.md).
- **P2 (Order queue):** this is the primary screen, opened via Expo Push tap. Must load in under 2 seconds per NFR even on 3G — see [`../00-foundation/design-system.md`](../00-foundation/design-system.md) performance constraints.
- **P3 (Order detail):** "mark packed" writes `orders.packed_at` and transitions status via `PATCH /orders/:id/status` — this is the only status transition the partner app is allowed to trigger. Attempting any other transition from this app is a spec violation, not a feature.
- **P4 (Catalog):** stock toggle is instant (optimistic UI, then confirmed) — a store owner flipping "out of stock" mid-rush needs it to feel immediate, not wait on a round trip before the UI reflects it.
- **P5 (Payouts):** read-only. Partner app never computes payouts — it displays what `/partner/payouts` returns, computed server-side/admin-side per [`04-admin-dashboard/`](../04-admin-dashboard/README.md).

## Acceptance criteria

- [ ] All 6 screens implemented with every listed state variant reachable
- [ ] P1's pending-approval state shows no order/catalog/payout data — fully gated, not partially visible
- [ ] P2 loads in under 2s on a throttled 3G connection (manually verified once)
- [ ] P3 triggers only the `packed` status transition — verified no other status value is reachable from this app's code
- [ ] P4 stock toggle updates optimistically in the UI before server confirmation returns
- [ ] P5 shows no payout-calculation logic client-side — purely a display of server-computed data
