# Analytics

## Purpose

Event tracking and the success metrics they roll up to — instrumented from day 1, not bolted on post-launch, per PRD's eSamudaay lesson (engagement problems are only diagnosable if instrumented before they happen).

## Tool

PostHog or a Supabase event table — either sufficient at this scale. Pick one in Week 1 and don't revisit the choice without a real scaling reason.

## Events

| Event | Fired by | Purpose |
|---|---|---|
| `order_placed`, `order_delivered`, `order_cancelled` | Backend, on status transition | Core funnel |
| `app_opened`, `zone_selected` | Customer app | Entry funnel |
| `store_viewed`, `product_added_to_cart`, `cart_abandoned` | Customer app | Leading indicator of engagement problems — `cart_abandoned` specifically, instrumented from day 1 per the eSamudaay risk mitigation |
| `reorder_tapped` | Customer app | Repeat-behavior signal |
| `partner_order_accepted`, `partner_order_packed`, `partner_app_session` | Partner app | Adoption tracking against the >90% target |
| `rider_assignment_accepted`, `rider_delivery_completed`, `rider_app_session` | Rider app | Adoption tracking against the 100% target |

## Success metrics these events roll up to (first 90 days post-launch)

| Metric | Target |
|---|---|
| Partner stores onboarded | 10-15 in launch zone |
| Weekly active customers | 150+ |
| Orders/week | 100+ |
| Repeat order rate (14-day) | >40% |
| Average delivery time | <60 min |
| Store partner retention (day 90) | >80% |
| Rider utilization | >3 orders/hour at peak |
| Partner app adoption (vs. WhatsApp fallback) | >90% of stores using app within 2 weeks of onboarding |
| Rider app adoption | 100% of active riders — no WhatsApp fallback once launched |
| App cold start (all 3 native apps) | <3s on mid-range Android |
| Catalog load | <2s |
| Crash-free session rate | >99.5%, tracked per app |

**Hard stop-and-diagnose signal:** repeat-order rate below ~25% at day 90 mirrors eSamudaay's known engagement failure. If partner or rider app adoption lags badly despite the software working, that's a distinct signal from order-demand weakness — diagnose separately (installation friction? training gap? genuine resistance to leaving WhatsApp/paper habits?).

## Acceptance criteria

- [ ] Every event in the table above fires correctly from its stated source, verified once per event
- [ ] `cart_abandoned` is live before customer-app launch, not added retroactively after a low-engagement signal appears
- [ ] Crash-free session rate is tracked per app (4 separate numbers), not blended into one figure that could hide one bad app behind three good ones
