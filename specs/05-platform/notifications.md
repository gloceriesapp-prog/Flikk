# Notifications

## Purpose

Three distinct notification channels, each scoped to a specific role — don't cross-wire them.

## Channel map

| Channel | Used for | Provider |
|---|---|---|
| WhatsApp Business API | Customer order-status updates | Interakt or Gupshup |
| SMS (fallback only) | Customer order-status updates, only if WhatsApp delivery fails | Twilio |
| Expo Push | Partner: new order. Rider: new assignment | Expo Push Notifications (free at this scale) |

## Why the split (don't "simplify" this to one channel)

- **Customers** don't have an installed-app relationship with Flikk in the same trust-building way partner/rider do at launch — WhatsApp is the channel they already trust and check. SMS is the fallback if WhatsApp delivery fails, never the primary.
- **Partner and rider** are installed-app users with a direct, ongoing relationship to the platform — native push is faster and more reliable than routing time-sensitive operational alerts (new order, new assignment) through a third-party messaging API. This replaced an earlier WhatsApp-fallback plan for partner/rider specifically because both became native apps instead of a web dashboard — see `claude.md`/PRD Section 18 for the reasoning if this ever seems worth reversing.

## Triggers

| Event | Channel | Recipient |
|---|---|---|
| Order placed | WhatsApp template message | Customer |
| Order packed | WhatsApp template message | Customer |
| Order out for delivery | WhatsApp template message | Customer |
| Order delivered | WhatsApp template message | Customer |
| New order in queue | Expo Push | Partner (that store's owner) |
| New assignment | Expo Push | Rider (the assigned rider) |

Every trigger above fires from the same place: `PATCH /orders/:id/status` and the admin's manual rider-assignment endpoint ([`../00-foundation/api-conventions.md`](../00-foundation/api-conventions.md)) — notification dispatch is a side effect of the status-write path, not a separate polling job.

## Rules

- WhatsApp template messages only — not freeform, per WhatsApp Business API policy.
- SMS fires only on confirmed WhatsApp delivery failure, not as a duplicate always-on channel.
- Push tokens are registered per-device in the partner/rider apps at login and refreshed on token-rotation — a stale token must not silently blackhole an alert with no fallback path (log the failure at minimum).

## Acceptance criteria

- [ ] All four order-status transitions fire the correct WhatsApp template to the customer
- [ ] SMS fires only when WhatsApp delivery is confirmed failed, verified by a test that simulates WhatsApp failure
- [ ] New order in partner queue triggers Expo Push to that store's owner within a few seconds
- [ ] New rider assignment triggers Expo Push to that rider within a few seconds
- [ ] A failed push delivery is logged, not silently dropped
