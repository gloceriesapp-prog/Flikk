// Run: npx tsx src/features/active-order-tracker/activeOrderEta.selfcheck.ts
import assert from 'node:assert';
import { resetWindowMinutes, computeDisplayEta } from './activeOrderEta';

const MIN = 60_000;

// --- reset window picks 15 for long orders, 10 for short / unknown ---
assert.equal(resetWindowMinutes(35), 15);
assert.equal(resetWindowMinutes(15), 15);
assert.equal(resetWindowMinutes(14), 10);
assert.equal(resetWindowMinutes(10), 10);
assert.equal(resetWindowMinutes(null), 10);
assert.equal(resetWindowMinutes(undefined), 10);

// --- before the deadline: real minutes remaining (ceil) ---
assert.equal(computeDisplayEta({ deadlineMs: 11 * MIN, baseMinutes: 35, nowMs: 0 }), 11);
assert.equal(computeDisplayEta({ deadlineMs: 11 * MIN + 1, baseMinutes: 35, nowMs: 0 }), 12); // ceil

// --- at the deadline: restart from the full reset window (never 0) ---
assert.equal(computeDisplayEta({ deadlineMs: 0, baseMinutes: 35, nowMs: 0 }), 15);
assert.equal(computeDisplayEta({ deadlineMs: 0, baseMinutes: 12, nowMs: 0 }), 10);

// --- past the deadline: counts down inside the reset window ---
assert.equal(computeDisplayEta({ deadlineMs: 0, baseMinutes: 35, nowMs: 1 * MIN }), 14); // 15-win, 1 min in
assert.equal(computeDisplayEta({ deadlineMs: 0, baseMinutes: 35, nowMs: 14 * MIN }), 1); // almost looped
assert.equal(computeDisplayEta({ deadlineMs: 0, baseMinutes: 35, nowMs: 15 * MIN }), 15); // looped -> restart
assert.equal(computeDisplayEta({ deadlineMs: 0, baseMinutes: 35, nowMs: 16 * MIN }), 14); // next loop, 1 min in
assert.equal(computeDisplayEta({ deadlineMs: 0, baseMinutes: 10, nowMs: 1 * MIN }), 9); // 10-win short order

// --- never 0/negative, ever, at any offset across several loops ---
for (let m = 0; m <= 60; m++) {
  const v = computeDisplayEta({ deadlineMs: 0, baseMinutes: 35, nowMs: m * MIN });
  assert.ok(v >= 1 && v <= 15, `minute ${m} -> ${v} out of 1..15`);
}

// --- unknown deadline falls back to the reset window ---
assert.equal(computeDisplayEta({ deadlineMs: null, baseMinutes: 35, nowMs: 123 }), 15);
assert.equal(computeDisplayEta({ deadlineMs: NaN, baseMinutes: 8, nowMs: 123 }), 10);

console.log('activeOrderEta.selfcheck OK');
