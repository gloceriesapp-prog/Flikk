# Rider App — Screens

## Purpose

Full screen inventory for the rider app. Bottom-tab structure: Assignments / Earnings. Simplest visual layer of the three RN apps — see [`../00-foundation/design-system.md`](../00-foundation/design-system.md) tone guidance — but still no different palette.

## Screen inventory

| # | Screen | Purpose | Key state variants |
|---|---|---|---|
| R1 | Login (OTP) | Rider auth | Active rider / inactive |
| R2 | Assignment queue (home) | Current pickup/drop tasks | No assignment / assigned, awaiting pickup / picked up, en route |
| R3 | Assignment detail | Store address, customer address, order summary | Pre-pickup / post-pickup (shows drop details prominently) |
| R4 | Mark delivered | Confirm drop-off | Success confirmation |
| R5 | Earnings/history | Completed deliveries, per-day earnings | Today / this week |

## Notes per screen

- **R1 (Login):** same approval-gate pattern as partner app P1 — unapproved rider (`users.is_approved = false`) sees a waiting state, not the assignment queue. See [`../00-foundation/auth-and-roles.md`](../00-foundation/auth-and-roles.md).
- **R2 (Assignment queue):** assignments are admin-assigned, never self-selected — there is no "available jobs to claim" list here, only "here's what you've been given." This is a deliberate MVP constraint, not a missing feature — see [`../00-foundation/out-of-scope.md`](../00-foundation/out-of-scope.md) (automated/self-assignment routing is out of scope).
- **R3 (Assignment detail):** pre-pickup view emphasizes the store/pickup address; post-pickup view re-emphasizes the drop address prominently — this is a UX-critical state switch, riders should not have to hunt for the address relevant to their current step.
- **R4 (Mark delivered):** writes `orders.delivered_at`, transitions status to `delivered` via `PATCH /orders/:id/status`. This is the terminal action for the rider on this order — triggers the customer-facing "delivered" WhatsApp notification and `rider_earnings` row creation.
- **R5 (Earnings):** read-only, sources from `rider_earnings` table — this app never computes earnings client-side, matching the partner app's payout-display pattern.

## Rider app also triggers "picked up"

Not a distinct screen, but a critical action worth calling out: from R3 (post-arrival at store), the rider marks "picked up" — this writes `orders.picked_up_at` and transitions status to `out_for_delivery`. This is a new data point v1 didn't have when partner/rider were web/WhatsApp-only — the rider app is the only writer of this field.

## Acceptance criteria

- [ ] All 5 screens implemented with every listed state variant reachable
- [ ] R1's pending-approval state shows no assignment/earnings data
- [ ] R2 shows only admin-assigned tasks — no self-claim/browse-available-jobs UI exists anywhere
- [ ] R3 correctly swaps address emphasis between pre-pickup and post-pickup states
- [ ] R4's "mark delivered" writes `delivered_at` and transitions status exactly once — a double-tap must not double-fire the transition or create two `rider_earnings` rows
- [ ] "Mark picked up" writes `picked_up_at` and transitions to `out_for_delivery` — verified this is the only app that writes `picked_up_at`
- [ ] R5 shows no client-side earnings computation — purely a display of server data
