# Rider App — Flows

## Purpose

Ties the rider app's screens to backend behavior and the admin-assignment dependency.

## Primary flow: assignment handling

```
push notification (new assignment) → open app → assignment queue (R2) → assignment detail (R3)
  → mark picked up → deliver → mark delivered (R4) → status auto-updates to customer → earnings entry appears (R5)
```

1. Admin manually assigns a rider to a `packed`/ready order via [`04-admin-dashboard/`](../04-admin-dashboard/README.md) A3 — this is the only path an assignment is created. Backend fires Expo Push to the assigned rider ([`../05-platform/notifications.md`](../05-platform/notifications.md)).
2. R2 shows the new assignment — `GET /rider/assignments`.
3. Rider opens R3, travels to store, marks "picked up" — `PATCH /orders/:id/status` with `out_for_delivery`, writes `picked_up_at`. Customer's order tracking (C10) updates in real time.
4. Rider travels to customer, marks "delivered" via R4 — `PATCH /orders/:id/status` with `delivered`, writes `delivered_at`. This triggers: customer WhatsApp "delivered" notification, `rider_earnings` row creation (amount from the delivery fee, per PRD Section 22 monetization), and the order becomes visible in R5.

## Edge cases

- **Rider marks delivered without marking picked up first:** state machine must reject this — `delivered` is only reachable from `out_for_delivery`, not directly from `packed`. See [`../00-foundation/data-model.md`](../00-foundation/data-model.md) and [`../05-platform/testing-strategy.md`](../05-platform/testing-strategy.md).
- **Rider is offline/poor connectivity when marking picked-up or delivered:** per NFR, this app must queue the action and retry rather than fail hard — worst-connectivity surface of the three RN apps, this matters more here than anywhere else in the product.
- **Admin reassigns a rider mid-delivery (rare, but possible if the first rider is unreachable):** out of scope to design a reassignment UI for v1 unless explicitly requested — flag if this need arises rather than building it speculatively (see [`../00-foundation/out-of-scope.md`](../00-foundation/out-of-scope.md) on automated reassignment).

## Acceptance criteria

- [ ] Full flow completes end-to-end: admin assigns → rider sees assignment → picked up → delivered → customer sees "delivered" in real time → earnings entry appears
- [ ] `delivered` transition is rejected server-side if the order is not currently `out_for_delivery` (tested)
- [ ] A picked-up or delivered action taken while offline queues and retries successfully once connectivity returns, without duplicating the status write
- [ ] `rider_earnings` row amount matches the order's delivery fee per the monetization model, verified by one test
