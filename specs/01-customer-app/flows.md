# Customer App — Flows

## Purpose

End-to-end journeys that tie screens ([`screens.md`](screens.md)) to backend behavior ([`../00-foundation/api-conventions.md`](../00-foundation/api-conventions.md)) and platform concerns ([`../05-platform/`](../05-platform/README.md)).

## Primary flow: order placement

```
zone gate (C2) → browse (C3/C4) → catalog (C5/C6) → cart (C7)
  → checkout (C8) → confirmation (C9) → tracking (C10) → delivered → reorder (C11)
```

1. **Zone gate:** `GET /zones` — only proceeds if the customer's selected zone `is_active`.
2. **Browse:** `GET /stores?zone_id=` then `GET /stores/:id/products`.
3. **Cart:** client-side state (Zustand) until checkout — no server round-trip per add-to-cart.
4. **Checkout → confirmation:** `POST /orders` (the transactional endpoint, [`../00-foundation/api-conventions.md`](../00-foundation/api-conventions.md)) → Razorpay checkout ([`../05-platform/payments.md`](../05-platform/payments.md)) → webhook confirms → C9 renders success/failure based on confirmed state, not client-optimistic assumption.
5. **Tracking:** C10 subscribes via Supabase Realtime to this one order ([`../05-platform/realtime.md`](../05-platform/realtime.md)). WhatsApp notification fires on every status transition in parallel ([`../05-platform/notifications.md`](../05-platform/notifications.md)) — the two channels are redundant by design (in-app for open-app users, WhatsApp for backgrounded).
6. **Reorder:** from C11, pre-fills a new cart from a past order's items, re-validating current stock/price (never reuses `unit_price_at_order` from the old order — that value is historical only, per [`../00-foundation/data-model.md`](../00-foundation/data-model.md)).

## Edge cases that must be handled, not assumed away

- **Item goes out of stock between cart-add and checkout:** `POST /orders` re-validates stock server-side (see API conventions) — checkout must surface this as a clear per-item message, not a generic failure.
- **Payment fails after order row created:** order must not silently sit in `placed` with no payment — C9's failure state gives a retry path, and the order should not be visible to the partner app's queue until payment is confirmed (don't let an unpaid order reach `partner/orders`).
- **Network drop mid-checkout on 3G:** per NFR, optimistic UI with a retry queue, not a hard failure — this app must survive a checkout attempt that needs to retry the request, without double-charging or double-creating the order (idempotency on the client's retry, not just hope).

## Acceptance criteria

- [ ] Full flow completes end-to-end with a real small-value Razorpay transaction (mirrors the platform payments spec's criterion)
- [ ] Out-of-stock-at-checkout surfaces a specific per-item message, verified by a test that marks an item out-of-stock between cart-add and checkout submit
- [ ] An order with unconfirmed payment never appears in the partner app's order queue
- [ ] A retried checkout request (simulated network drop) does not create a duplicate order
- [ ] Reorder always re-fetches current price/stock, never reuses historical `unit_price_at_order`
