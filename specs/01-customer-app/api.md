# Customer App — API Usage

## Purpose

Maps each screen to the exact backend endpoints it calls. Full endpoint contracts live in [`../00-foundation/api-conventions.md`](../00-foundation/api-conventions.md) — this file is the customer app's usage index only, not a second contract definition.

## Screen → endpoint map

| Screen | Endpoint(s) |
|---|---|
| C1 Splash | Session check via stored auth token (Supabase session validation) |
| C2 Zone select | `GET /zones` |
| C3 Home, C4 Store list | `GET /stores?zone_id=` |
| C5 Store catalog, C6 quick-add | `GET /stores/:id/products` |
| C7 Cart | Client-side only (Zustand), no endpoint |
| C8 Checkout | `POST /orders` |
| C9 Confirmation | `GET /orders/:id`, plus Razorpay checkout SDK + `/payments/webhook` (server-side, not called by the app) |
| C10 Order tracking | `GET /orders/:id` (initial load) + Supabase Realtime subscription (live updates) — see [`../05-platform/realtime.md`](../05-platform/realtime.md) |
| C11 Profile & history | `GET /orders` (own, list) — reorder re-triggers the C5-C8 flow with pre-filled cart |

## Auth

All endpoints above require a valid `customer`-role session per [`../00-foundation/auth-and-roles.md`](../00-foundation/auth-and-roles.md). `/auth/otp/request` and `/auth/otp/verify` handle login, shared across all four apps — not customer-specific implementations.

## Acceptance criteria

- [ ] Every screen in [`screens.md`](screens.md) calls only the endpoints listed here — no undocumented endpoint usage
- [ ] No screen calls a `/partner/*`, `/rider/*`, or `/admin/*` endpoint
- [ ] C9/C10 never call `/payments/webhook` directly from the client — that's server-to-server only
