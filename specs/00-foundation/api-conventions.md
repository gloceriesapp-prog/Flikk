# API Conventions

## Purpose

One backend (Node/Express monolith) serves all four apps. This file defines the shape every endpoint follows and lists the full endpoint surface, so app-level specs can reference an endpoint by name without re-describing its contract.

## Shape

- **REST, resource-based.** `/resource`, `/resource/:id`, `/resource/:id/subresource`.
- **Role-scoped auth on every endpoint** — see [`auth-and-roles.md`](auth-and-roles.md). No endpoint is unauthenticated except `/auth/otp/*` and `/payments/webhook` (Razorpay-signature-verified instead).
- **JSON in, JSON out.** No form-encoded bodies.
- **Error format**, consistent across every endpoint:

```json
{
  "error": {
    "code": "STOCK_UNAVAILABLE",
    "message": "One or more items in your cart are out of stock."
  }
}
```

- **Status codes:** `200`/`201` success, `400` validation error, `401` no/invalid session, `403` authenticated but wrong role or not approved, `404` not found or not visible to this role (don't leak existence via 403 vs 404 — use 404 when RLS would hide the row anyway), `409` state-conflict (e.g. invalid order-status transition), `500` unexpected.

## Full endpoint table

| Endpoint | Method | Consumed by | Purpose |
|---|---|---|---|
| `/auth/otp/request` | POST | All 4 apps | Send OTP to phone |
| `/auth/otp/verify` | POST | All 4 apps | Verify OTP, issue role-scoped session |
| `/zones` | GET | Customer | List serviceable zones |
| `/stores?zone_id=` | GET | Customer | Stores in a zone |
| `/stores/:id/products` | GET | Customer | Store catalog |
| `/orders` | POST | Customer | Create order — see below, the one transactional endpoint |
| `/orders/:id` | GET | Customer, Partner, Rider, Admin | Order detail + status, scoped to what each role should see |
| `/orders/:id/status` | PATCH | Partner (packed), Rider (picked-up/delivered), Admin | Updates status, triggers realtime + notification |
| `/payments/webhook` | POST | Razorpay | Payment confirmation, signature-verified |
| `/partner/products` | GET/POST/PATCH | Partner app | Catalog management |
| `/partner/orders` | GET | Partner app | Store's incoming order queue |
| `/partner/payouts` | GET | Partner app | Own store's payout history |
| `/rider/assignments` | GET | Rider app | Rider's current/past assignments |
| `/rider/earnings` | GET | Rider app | Rider's earnings history |
| `/admin/stores/pending` | GET/PATCH | Admin | Store approval |
| `/admin/riders/pending` | GET/PATCH | Admin | Rider approval |
| `/admin/orders` | GET | Admin | Cross-store order monitor |
| `/admin/orders/:id/assign-rider` | PATCH | Admin | Manual rider assignment |
| `/admin/payouts` | GET | Admin | Weekly payout computation, export |

## `POST /orders` — the one transactional endpoint

This is the highest-risk endpoint in the backend — real money, real stock, must be all-or-nothing:

1. Validate every item's stock (`products.is_in_stock`) at time of order, not at time of cart-add.
2. Lock item prices into `order_items.unit_price_at_order` — never read `products.price` again for this order after this point.
3. Create `orders` + `order_items` rows in a single DB transaction.
4. Initiate Razorpay payment intent.
5. If any step fails, roll back the whole transaction — no partial order, no order with some but not all items priced.

Reject (400) if the cart spans more than one `store_id` — single-store-per-order is enforced here, not just trusted from the client.

## `PATCH /orders/:id/status`

- Enforces the state machine from [`data-model.md`](data-model.md): `placed → packed → out_for_delivery → delivered`, `cancelled` only from `placed`/`packed`. Invalid transition → `409`.
- Which role can trigger which transition is fixed: partner triggers `packed`, rider triggers `out_for_delivery` (on pickup) and `delivered`, admin can trigger `cancelled`. A role attempting a transition outside its own set → `403`.
- On success: writes the relevant timestamp column (`packed_at`/`picked_up_at`/`delivered_at`), publishes to Supabase Realtime, fires the relevant notification — see [`../05-platform/notifications.md`](../05-platform/notifications.md) and [`../05-platform/realtime.md`](../05-platform/realtime.md).

## Acceptance criteria

- [ ] Every endpoint in the table above exists and returns the documented error shape on failure
- [ ] `POST /orders` is wrapped in a single DB transaction — verified by a test that forces a mid-transaction failure and confirms no partial rows persist
- [ ] `POST /orders` rejects multi-store carts with 400
- [ ] `PATCH /orders/:id/status` rejects invalid transitions with 409 and rejects wrong-role attempts with 403 (test matrix: every role × every transition)
- [ ] `/payments/webhook` verifies Razorpay signature before processing, rejects unsigned/invalid requests
