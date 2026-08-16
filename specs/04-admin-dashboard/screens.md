# Admin Dashboard — Screens

## Purpose

Full screen inventory for the founder-only web dashboard.

## Screen inventory

| # | Screen | Purpose | Key state variants |
|---|---|---|---|
| A1 | Store onboarding | Approve/reject new store applications | Pending / approved / rejected |
| A2 | Rider onboarding | Approve/reject new rider applications (not separately numbered in PRD screen table but required per FR20) | Pending / approved / rejected |
| A3 | Rider assignment | Manually assign a rider to a ready order | Unassigned orders / assigned |
| A4 | Payouts & commission | Store payout calculation, CSV export | Current cycle / historical |

## Notes per screen

- **A1/A2 (Onboarding):** approving a store/rider here is the only path that flips `users.is_approved` to `true` — this must be the sole write path to that column. See [`../00-foundation/auth-and-roles.md`](../00-foundation/auth-and-roles.md). Rejecting should leave a clear terminal state, not just silently do nothing.
- **A3 (Rider assignment):** shows orders in `packed` status with no `rider_id` yet — assignment is fully manual, founder picks from a list of active/available riders. No suggested-rider algorithm, no auto-assign button — see [`../00-foundation/out-of-scope.md`](../00-foundation/out-of-scope.md).
- **A2 cross-app order monitor** (note: PRD's screen table lists "cross-app order monitor" as A2 and folds rider onboarding into FR20 without a dedicated screen number — resolve this numbering gap by treating rider onboarding as part of the A1 onboarding flow, tabbed store/rider, rather than inventing a fifth screen number not in the PRD. Cross-app order monitor is the actual A2.):

| # | Screen | Purpose | Key state variants |
|---|---|---|---|
| A2 | Cross-app order monitor | All orders, all stores, live status | Filter by status/store/zone |

- **A2 (Order monitor):** Supabase Realtime subscription, filtered/paginated per [`../05-platform/realtime.md`](../05-platform/realtime.md) — must not pull the full unfiltered orders table into the browser.
- **A4 (Payouts):** this is where payout/commission calculation actually happens server-side — the partner app's P5 and this screen both read the result, but only admin (via this screen's backing endpoint) triggers computation and CSV export.

## Acceptance criteria

- [ ] A1 (store + rider onboarding, tabbed or otherwise) is the only UI path that sets `users.is_approved = true`
- [ ] A2 (order monitor) updates live without polling, filtered/paginated
- [ ] A3 shows only unassigned, `packed`-status orders as candidates, and only active riders as assignable — no algorithmic suggestion or auto-assign control exists
- [ ] A4's CSV export matches the commission model in PRD Section 22 (12-18% from store partner per order) — verified against at least one hand-calculated example
