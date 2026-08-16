# Testing Strategy

## Purpose

Match test effort to actual risk, not to what "professional" projects usually have. This is a solo-dev project — blanket coverage is a cost, not a virtue, when it's spent on code that can't meaningfully break in an expensive way.

## What needs a runnable test

- **Every function that touches money**: order totals, commission calculation, payout amounts. Real-money path in a business run by one person — bugs here are expensive and easy to miss by eye.
- **The order status state machine** (`placed → packed → out_for_delivery → delivered`, plus `cancelled`): valid and invalid transitions, all four roles × all transitions. Shared logic all three operational apps depend on agreeing about — see [`../00-foundation/api-conventions.md`](../00-foundation/api-conventions.md).
- **`POST /orders` transactional integrity**: a forced mid-transaction failure must leave no partial order/order_items rows.
- **RLS policies**: at minimum one test per role per table from [`../00-foundation/data-model.md`](../00-foundation/data-model.md)'s RLS table, confirming each role sees only what it should.
- **Razorpay webhook signature verification**: reject tampered/unsigned payloads.

## What gets one smoke test, not a suite

- Each of the four apps: does it boot, does auth work. That's the entire UI test surface at this stage — no framework-heavy screen-level test suite until real usage surfaces real bugs worth guarding against.

## What gets no test at all

- Trivial CRUD (e.g. a product-catalog edit endpoint) — match effort to actual risk, not to a coverage percentage.

## Self-review discipline (in place of heavier process, given solo dev)

Before merging any change touching `orders`, `payouts`, or `order_items`: re-read the diff specifically for (1) off-by-one/rounding errors in money math, (2) RLS policy gaps. These two failure classes are the ones that lose real money or leak real data — everything else is more forgiving to get slightly wrong and fix later.

## Acceptance criteria

- [ ] Order-total, commission, and payout calculation functions each have a runnable test with at least one edge case (e.g. zero-quantity line, rounding boundary)
- [ ] State-machine test covers every valid transition and at least the most obviously invalid ones (e.g. `placed → delivered` skipping intermediate states)
- [ ] `POST /orders` has a test forcing a mid-transaction failure and asserting no partial rows persist
- [ ] RLS test matrix exists: one test per role per table minimum
- [ ] Each of the four apps has exactly one smoke test (boots + auth works) — not more, not less, at this stage
