// Runnable self-check for the order baseline/diff logic. No framework:
// `npx tsx src/store/orderBaseline.selfcheck.ts` from apps/partner.
import assert from 'node:assert';
import { computeNewlyArrivedIds, computeJustDeliveredIds, type BaselineRow } from './orderBaseline';

const r = (id: string, status: string): BaselineRow => ({ id, status });

// --- computeNewlyArrivedIds ---

// First poll of a session (baseline not established) seeds silently — 3 orders
// already sitting there must NOT alert.
assert.deepEqual(
  computeNewlyArrivedIds([], [r('a', 'placed'), r('b', 'placed'), r('c', 'placed')], false),
  [],
  'first poll must seed without alerting',
);

// An order present in the prior poll does NOT re-alert.
assert.deepEqual(
  computeNewlyArrivedIds([r('a', 'placed')], [r('a', 'placed')], true),
  [],
  'order carried over from prior poll must not re-alert',
);

// A genuinely new placed id DOES alert.
assert.deepEqual(
  computeNewlyArrivedIds([r('a', 'placed')], [r('a', 'placed'), r('b', 'placed')], true),
  ['b'],
  'a brand-new placed order must alert',
);

// A new order that is NOT 'placed' (e.g. appears already out_for_delivery via a
// late poll) must not alert — only 'placed' is the "customer just ordered" signal.
assert.deepEqual(
  computeNewlyArrivedIds([r('a', 'placed')], [r('a', 'placed'), r('b', 'out_for_delivery')], true),
  [],
  'non-placed new rows must not alert',
);

// Reappearing after an outage: the failed poll never ran this fn (it threw), so
// `previous` still holds the order; when the next successful poll includes it,
// it is in previous → not re-alerted.
assert.deepEqual(
  computeNewlyArrivedIds([r('a', 'placed')], [r('a', 'placed')], true),
  [],
  'order that persisted across an outage must not re-alert',
);

// --- computeJustDeliveredIds ---

// placed -> delivered between two polls = a real transition, fires once.
assert.deepEqual(
  computeJustDeliveredIds([r('a', 'out_for_delivery')], [r('a', 'delivered')], true),
  ['a'],
  'a fresh delivery transition must fire',
);

// Already delivered on the previous poll = no re-fire.
assert.deepEqual(
  computeJustDeliveredIds([r('a', 'delivered')], [r('a', 'delivered')], true),
  [],
  'already-delivered must not re-fire',
);

// First-seen as delivered (not in previous) = stale/late poll catching up, not a
// transition we witnessed — must not fire.
assert.deepEqual(
  computeJustDeliveredIds([], [r('a', 'delivered')], true),
  [],
  'first-seen-as-delivered must not fire',
);

// Baseline not established → nothing fires (opening to past deliveries).
assert.deepEqual(
  computeJustDeliveredIds([], [r('a', 'delivered')], false),
  [],
  'first poll must not fire delivered banners',
);

console.log('orderBaseline.selfcheck: all cases OK');
