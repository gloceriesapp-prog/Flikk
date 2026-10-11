// Runnable check for the net-money math (repo CLAUDE.md: every function that
// touches money needs a runnable test). This app has no test framework
// installed and we add no dependency for one, so this uses Node's built-in
// runner with native TypeScript loading (Node >= 22.18 strips types by
// default). Run it from apps/partner-dashboard:
//
//   node --test src/lib/orderRevenue.test.mjs
//
// It is a plain .mjs so it stays outside the tsc/Next program (which only
// roots .ts/.tsx/.mts) while still importing the real .ts helper, so a drift
// in the formula fails this check rather than passing a stale copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderNetRevenue, lineNetRevenue } from './orderRevenue.ts';

test('orderNetRevenue = item_total - commission_amount (never the gross total)', () => {
  assert.equal(orderNetRevenue({ item_total: 500, commission_amount: 30 }), 470);
});

test('line net apportions order commission across lines by item-total share', () => {
  const order = { item_total: 500, commission_amount: 50 }; // 10% commission
  // Two lines, 300 + 200 = 500 gross; each loses 10% -> 270 + 180.
  assert.equal(lineNetRevenue(order, 300), 270);
  assert.equal(lineNetRevenue(order, 200), 180);
  // Apportionment conserves the order total.
  assert.equal(lineNetRevenue(order, 300) + lineNetRevenue(order, 200), orderNetRevenue(order));
});

test('zero item_total cannot divide by zero', () => {
  assert.equal(lineNetRevenue({ item_total: 0, commission_amount: 0 }, 0), 0);
});
