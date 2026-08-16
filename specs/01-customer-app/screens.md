# Customer App — Screens

## Purpose

Full screen inventory for the customer app. Bottom-tab structure: Home / Orders / Profile. Don't share a navigation shell with partner/rider apps — see [`../00-foundation/repo-structure.md`](../00-foundation/repo-structure.md).

## Screen inventory

| # | Screen | Purpose | Key state variants |
|---|---|---|---|
| C1 | Splash | Brand entry, session check | Cold start / returning user |
| C2 | Zone select | Gate to serviceable pockets only | Available / waitlist / unavailable |
| C3 | Home | Discovery — categories, ETA banner, featured stores | First-time / returning |
| C4 | Store list | Browse, filter by category/rating/ETA | Empty state |
| C5 | Store catalog | Product grid, tabbed categories | In stock / out of stock / cart-float visible |
| C6 | Product quick-add sheet | Add without leaving catalog | Qty 0 / qty >0 |
| C7 | Cart | Review before payment | Empty / single-store / min order not met |
| C8 | Checkout | Address + payment | Saved / new address, payment method select |
| C9 | Order confirmation | Post-payment reassurance | Success / payment failed |
| C10 | Order tracking | Status timeline + rider contact | Placed/packed/out/delivered/delayed |
| C11 | Profile & order history | Account, reorder, saved addresses | Has orders / none |

## Notes per screen

- **C2 (Zone select):** since v1 is single-zone, "unavailable" is the expected state for most visitors outside the launch pocket — this screen must handle that gracefully (a waitlist capture, not a dead end), not assume everyone who opens the app is in-zone.
- **C5/C6 (Catalog / quick-add):** enforces single-store-per-order at the UI level — attempting to add an item from a second store while a cart from another store is active must prompt to clear the existing cart, not silently merge.
- **C7 (Cart):** "min order not met" state — if a minimum order value exists, block checkout with a clear message, don't let the customer discover it only after tapping pay.
- **C9 (Order confirmation):** payment-failed state must give a clear retry path, not strand the customer.
- **C10 (Order tracking):** 4-stage, non-GPS — status timeline (placed/packed/out_for_delivery/delivered) plus a real rider name/phone once assigned. No live map. See [`../00-foundation/out-of-scope.md`](../00-foundation/out-of-scope.md).
- **C11 (Order history):** max 3 saved addresses per FR8 — the add-address flow must block a 4th, not silently allow it.

## Acceptance criteria

- [ ] All 11 screens implemented with every listed state variant reachable and manually verified
- [ ] C2 handles out-of-zone visitors without a dead-end (waitlist or equivalent capture)
- [ ] C5/C6 block cross-store cart mixing with a clear prompt, not a silent merge or silent failure
- [ ] C7 surfaces "minimum order not met" before checkout is attempted, not after
- [ ] C10 shows no map/live-location UI element anywhere
- [ ] C11 hard-caps saved addresses at 3
