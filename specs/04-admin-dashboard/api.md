# Admin Dashboard — API Usage

## Purpose

Maps each screen to backend endpoints. Full contracts in [`../00-foundation/api-conventions.md`](../00-foundation/api-conventions.md).

## Screen → endpoint map

| Screen | Endpoint(s) |
|---|---|
| A1 Store/rider onboarding | `GET/PATCH /admin/stores/pending`, `GET/PATCH /admin/riders/pending` |
| A2 Cross-app order monitor | `GET /admin/orders` + Supabase Realtime subscription on `orders` |
| A3 Rider assignment | `PATCH /admin/orders/:id/assign-rider` (reads from the same `GET /admin/orders`, filtered to unassigned/packed) |
| A4 Payouts & commission | `GET /admin/payouts` |

## Auth

All `/admin/*` endpoints require an `admin`-role session ([`../00-foundation/auth-and-roles.md`](../00-foundation/auth-and-roles.md)). Admin accounts are provisioned manually (not self-signup, unlike the other three roles) — there is no "admin approval flow" analogous to A1's store/rider approval.

## Acceptance criteria

- [ ] Every screen calls only the endpoints listed here
- [ ] A non-admin session receives 403 on every `/admin/*` endpoint (tested)
- [ ] A3's assignment call only succeeds against orders in `packed` status with no existing `rider_id` — attempting to assign an already-assigned or non-packed order is rejected
