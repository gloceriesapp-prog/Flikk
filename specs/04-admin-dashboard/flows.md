# Admin Dashboard — Flows

## Purpose

Ties admin screens to the rest of the product — admin is the connective tissue between all three operational apps.

## Onboarding flow

```
store/rider applies (self-signup via partner/rider app OTP login)
  → appears in A1 as pending → founder reviews → approve/reject
  → approved: users.is_approved = true → partner/rider app unlocks (P1/R1 waiting state clears)
```

## Order lifecycle monitoring + assignment flow

```
order placed (customer app) → appears in A2 → store marks packed (partner app)
  → order now eligible for assignment in A3 → founder manually assigns a rider
  → rider app receives push, shows assignment (R2) → picked up → delivered
  → A2 reflects final "delivered" state in real time
```

This is the exact loop the Week 8 cross-app integration test runs 10+ times. Any break in this chain (an order that never appears in A2, an assignment that doesn't reach the rider app, a status that doesn't propagate back to the customer) is the class of bug this integration testing is specifically meant to catch — don't consider any single app "done" without this loop having been run against it.

## Payout flow

```
end of week → founder opens A4 → reviews computed payouts (per store, gross - commission = net)
  → exports CSV → pays stores/riders outside the app (manual bank transfer, v1 has no automated payout disbursement)
```

Note: v1 does not automate actual money movement to stores/riders — A4 computes and exports, the founder disburses manually. Don't build a payout-disbursement integration (e.g. automated bank transfer API) unless explicitly requested — not in PRD scope.

## Acceptance criteria

- [ ] A rejected store/rider application leaves `is_approved = false` permanently (no accidental approval path) and the applicant sees a clear rejected state, not an indefinite pending one
- [ ] The full order-lifecycle loop (place → pack → assign → pickup → deliver → monitor reflects it) completes with zero manual database intervention
- [ ] A4's export is a downloadable CSV, not just an on-screen table — verified the export button produces a real file
- [ ] No automated payout-disbursement code exists anywhere in the admin dashboard
