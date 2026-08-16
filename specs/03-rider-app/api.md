# Rider App — API Usage

## Purpose

Maps each screen to backend endpoints. Full contracts in [`../00-foundation/api-conventions.md`](../00-foundation/api-conventions.md).

## Screen → endpoint map

| Screen | Endpoint(s) |
|---|---|
| R1 Login | `/auth/otp/request`, `/auth/otp/verify` (shared across all 4 apps) |
| R2 Assignment queue | `GET /rider/assignments` |
| R3 Assignment detail + mark picked up | `GET /orders/:id`, `PATCH /orders/:id/status` (`out_for_delivery`) |
| R4 Mark delivered | `PATCH /orders/:id/status` (`delivered`) |
| R5 Earnings/history | `GET /rider/earnings` |

## Push registration

Same pattern as the partner app: register Expo push token on login (R1 success), re-register on token rotation.

## Acceptance criteria

- [ ] Every screen calls only the endpoints listed here
- [ ] No screen calls `/partner/*` or `/admin/*` (except shared `/auth/*`)
- [ ] Push token registered on every successful login, re-registered on rotation
- [ ] `PATCH /orders/:id/status` calls from this app never attempt `packed` or `cancelled` — only `out_for_delivery` and `delivered` are reachable from rider-app code
