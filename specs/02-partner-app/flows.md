# Partner App — Flows

## Purpose

Ties the partner app's screens to backend behavior and cross-app dependencies.

## Primary flow: incoming order handling

```
push notification (new order) → open app → order queue (P2) → order detail (P3)
  → accept → pack → mark ready → rider (assigned by admin) picks up → weekly payout visible (P5)
```

1. Backend fires Expo Push to the store owner the moment `POST /orders` completes with confirmed payment ([`../05-platform/notifications.md`](../05-platform/notifications.md)).
2. P2 shows the new order in a "needs accept" state — `GET /partner/orders`.
3. Store owner opens P3, marks packed — `PATCH /orders/:id/status` with `packed`. This writes `packed_at` and fires the next chain: admin sees it as ready-to-assign in [`04-admin-dashboard/`](../04-admin-dashboard/README.md) A3, rider app receives an assignment once admin assigns.
4. Store owner has no further action on this order after marking packed — rider pickup and delivery are outside the partner app's scope entirely.
5. Payout accrues server-side; P5 is a read-only view of `/partner/payouts`.

## Catalog management flow

```
P4 → add/edit product → toggle stock
```

- Straightforward CRUD against `/partner/products`, scoped to the store owner's own `store_id` via RLS ([`../00-foundation/data-model.md`](../00-foundation/data-model.md)) — the backend must reject any attempt to edit a product belonging to a different store, even if the request is well-formed.

## Edge cases

- **Store owner tries to mark an order packed twice:** second attempt should be a no-op or clear "already packed" state (P3's state variant), not a duplicate `packed_at` write or an error that reads as a bug.
- **Order arrives while store owner has the app closed:** push notification is the only alert — if push delivery fails, the order still appears in P2 on next app open (P2's `GET /partner/orders` is always the source of truth, push is a notification layer on top, not the only way an order becomes visible).

## Acceptance criteria

- [ ] New confirmed-payment order triggers push within a few seconds and appears in P2 on next `GET /partner/orders` regardless of push delivery success
- [ ] Marking an already-packed order packed again is a no-op, not a duplicate write or error
- [ ] A store owner's `/partner/products` write attempt against another store's product is rejected (403/404, tested)
- [ ] Partner app triggers no status transition other than `packed` anywhere in its code
