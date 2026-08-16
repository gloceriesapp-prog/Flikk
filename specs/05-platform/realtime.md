# Realtime

## Purpose

How live status updates reach the customer app and admin dashboard without polling.

## Mechanism

**Supabase Realtime**, not a custom WebSocket layer, not polling. Don't hand-roll this — Supabase provides it as part of the same service already hosting Postgres/Auth.

## Usage

| Surface | Subscription | Trigger |
|---|---|---|
| Customer app — order tracking (C10) | Subscribe to the single active order row (`orders` where `id = :orderId`) | Any `PATCH /orders/:id/status` write |
| Admin dashboard — cross-app order monitor (A2) | Subscribe to the full `orders` table, filtered/paginated | Any order status write, any new order |

Partner and rider apps do **not** use Supabase Realtime for their primary "new order" / "new assignment" alerts — those go through Expo Push instead (see [`notifications.md`](notifications.md)). Realtime is for in-app live state while a screen is open; push is for waking up the app when it's backgrounded. Don't conflate the two or build both for the same event — pick the one that matches whether the recipient has the screen open (customer, tracking their one active order) or not (partner/rider, who need to be alerted even backgrounded).

## Rules

- Customer subscribes to exactly one order at a time (their active one) — not the full orders table, which is admin-only per RLS.
- Admin's full-table subscription must be paginated/filtered server-side, not pulling the entire orders table into the browser as it grows.

## Acceptance criteria

- [ ] Customer order tracking screen updates live (no manual refresh) when partner marks packed / rider marks picked-up / delivered
- [ ] Admin cross-app order monitor updates live as any order anywhere changes status
- [ ] Customer's realtime subscription is scoped to their own order only, verified against RLS (a customer cannot subscribe to another customer's order)
