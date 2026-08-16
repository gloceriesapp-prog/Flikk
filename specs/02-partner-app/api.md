# Partner App — API Usage

## Purpose

Maps each screen to backend endpoints. Full contracts in [`../00-foundation/api-conventions.md`](../00-foundation/api-conventions.md).

## Screen → endpoint map

| Screen | Endpoint(s) |
|---|---|
| P1 Login | `/auth/otp/request`, `/auth/otp/verify` (shared across all 4 apps) |
| P2 Order queue | `GET /partner/orders` |
| P3 Order detail | `GET /orders/:id`, `PATCH /orders/:id/status` (packed only) |
| P4 Catalog management | `GET/POST/PATCH /partner/products` |
| P5 Payouts | `GET /partner/payouts` |
| P6 Store settings | No dedicated endpoint specified in PRD Section 17 — implement as a `PATCH` on the store's own record if store-editable fields (hours, info) are needed; scope to own `store_id` only, same RLS rule as `/partner/products` |

## Push registration

On login (P1 success), register the device's Expo push token with the backend so `POST /partner/orders`-triggering events know where to send alerts. Re-register on token rotation (Expo SDK handles rotation events).

## Acceptance criteria

- [ ] Every screen calls only the endpoints listed here
- [ ] No screen calls `/rider/*` or `/admin/*` (except the shared `/auth/*`)
- [ ] Push token registered on every successful login, re-registered on rotation
- [ ] `/partner/products` and any P6 store-settings write are scoped server-side to the authenticated owner's own store — never trust a `store_id` passed in the request body
