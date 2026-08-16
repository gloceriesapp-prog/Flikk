# Data Model

## Purpose

Single source of truth for the Postgres schema (via Supabase). Every app-surface spec references tables here instead of redefining them. Do not add speculative columns for out-of-scope features — see [`out-of-scope.md`](out-of-scope.md).

## Schema

```sql
zones (
  id, name, slug, is_active, created_at
)

users (
  id, phone, name, role,  -- 'customer' | 'store_owner' | 'rider' | 'admin'
  is_approved,            -- gates store_owner/rider access until admin approval
  created_at
)

addresses (
  id, user_id, label, line1, landmark, zone_id, is_default
)

stores (
  id, owner_user_id, zone_id, name, category, rating,
  avg_prep_minutes, is_active, created_at
)

products (
  id, store_id, name, unit, price, category, is_in_stock,
  image_url
)

orders (
  id, customer_id, store_id, rider_id (nullable), address_id,
  status,        -- 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled'
  item_total, delivery_fee, commission_amount, total,
  razorpay_payment_id,
  placed_at, packed_at, picked_up_at, delivered_at
)

order_items (
  id, order_id, product_id, quantity, unit_price_at_order
)

riders (
  id, user_id, name, phone, vehicle_number, is_active
)

payouts (
  id, store_id, week_start, week_end, gross_amount,
  commission_deducted, net_payout, status
)

rider_earnings (
  id, rider_id, order_id, amount, paid_at
)
```

## Rules that must not be violated

- **`order_items.unit_price_at_order` is deliberately denormalized.** Never derive an order's total from current product prices — a price change after an order is placed must not change that order's historical total.
- **No GPS coordinates anywhere in `orders` or `addresses`.** That's v3 (PRD Section 26, [`out-of-scope.md`](out-of-scope.md)). Address is a text `line1` + `landmark`, not lat/lng.
- **`orders.status` is a strict state machine**: `placed → packed → out_for_delivery → delivered`, with `cancelled` reachable from `placed` or `packed` only. See [`../05-platform/testing-strategy.md`](../05-platform/testing-strategy.md) for the required transition test.
- **`orders.picked_up_at`** is written by the rider app's "mark picked up" action (see [`03-rider-app/`](../03-rider-app/README.md)) — not by the partner app, not by admin.
- **`zone_id` exists everywhere it's used from day 1** (`addresses`, `stores`) even though v1 only ever activates one zone. Don't hardcode a single-zone assumption into app logic — gate on `zones.is_active`, not on an assumed zone count.
- **`users.role` is the single auth-scoping column** for all four apps. Don't introduce a second role/permission table — see [`auth-and-roles.md`](auth-and-roles.md).
- **`users.is_approved`** gates `store_owner` and `rider` from using their app at all (not just specific actions) until an admin approves them. See [`04-admin-dashboard/`](../04-admin-dashboard/README.md) for the approval flow.
- **Single-store-per-order is enforced here**, not just in UI: `orders.store_id` is one value, not a list. `order_items` all belong to the same order → same store, by construction.

## Row-Level Security (RLS)

Enabled on every table above, implemented alongside the table — not a follow-up task. Policy summary:

| Table | `customer` | `store_owner` | `rider` | `admin` |
|---|---|---|---|---|
| `orders` | own orders only (`customer_id = auth.uid()`) | own store's orders only (`store_id` owned by them) | own assigned orders only (`rider_id = auth.uid()`) | all |
| `order_items` | via parent order ownership | via parent order ownership | via parent order ownership | all |
| `addresses` | own only | — | — | all |
| `products` | read-only, any store in their zone | own store's products, read/write | read-only | all |
| `payouts` | — | own store only | — | all |
| `rider_earnings` | — | — | own only | all |
| `stores` | read-only (active stores in zone) | own store, read/write | read-only | all |

Money-and-data-leak paths (`orders`, `payouts`, `order_items`, RLS policy gaps) are the two failure classes worth a deliberate self-review pass before merging — see `claude.md` "Code review discipline".

## Acceptance criteria

- [ ] All 9 tables exist in Supabase exactly as specified above, no extra speculative columns
- [ ] RLS enabled and policy-tested on every table per the table above (one test per role per table minimum)
- [ ] `order_items.unit_price_at_order` confirmed never joined against live `products.price` for total calculation anywhere in backend code
- [ ] `orders.status` transitions enforced server-side, not just client-side (invalid transition returns 4xx, doesn't silently succeed)
- [ ] No lat/lng column anywhere in the schema
