# Out of Scope — v1

## Purpose

This is a hard boundary, not a backlog for "later." Nothing on this list gets built, scaffolded, or dependency-added-for until the MVP has validated the metrics in [`../05-platform/analytics.md`](../05-platform/analytics.md) / PRD Section 8. If any spec in this folder set seems to require one of these, that's a spec bug — stop and flag it rather than building around the constraint.

## The list

| Item | Why it's excluded now | When it's revisited |
|---|---|---|
| Live GPS delivery tracking | Status-only 4-stage tracking is the v1 spec — having a rider app does not imply live map tracking for the customer. Rider app captures pickup/delivered timestamps, not a location feed. | v3 (PRD Section 26) |
| Automated rider-assignment/routing algorithm | Manual/founder-assigned dispatch is correct at MVP volume. The rider app receives assignments, it doesn't compute them. | v2, once manual dispatch hits its ceiling |
| Multi-city or multi-zone support | Single zone only. `zone_id` exists as a DB concept from day 1 ([`data-model.md`](data-model.md)), but the app only ever surfaces one active zone in v1. | v2.1, second-zone expansion |
| Real-time inventory sync with store POS systems | Store owners manage stock manually via the partner app's catalog toggle. | v3 |
| AI/conversational ordering | Not part of the core bet — the bet is asset-light kirana coordination, not a novel ordering interface. | Not on the current roadmap |
| Loyalty/rewards programs | | v1.1 at earliest (basic repeat-customer discount only, per PRD Section 26) |
| Multi-store cart | Single-store-per-order, enforced at schema level ([`data-model.md`](data-model.md): `orders.store_id` is singular) and UI level. | v3 |

## How this interacts with the four-app decision

`claude.md` is explicit: having three native apps (customer, partner, rider) instead of a leaner web-dashboard-plus-WhatsApp MVP does **not** imply any of the above is now in scope. A rider app is a receive-and-update tool, not a routing engine. Don't let "we already built a dedicated app for this role" become an argument for scope creep on what that app does.

## If you think you need one of these

Stop. Flag it to the user/product owner rather than implementing a workaround that quietly reintroduces the capability (e.g. don't add lat/lng "just in case," don't build a generic "assignment algorithm" hook that's technically manual today but architected for automation nobody asked for yet).
