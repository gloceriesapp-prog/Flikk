// ponytail: one runnable self-check for computeRiderStats's money/rating-adjacent
// math — the completion-rate zero-guard + rounding, and the default-5 rating
// convention. Run: npx tsx backend/src/lib/riderStats.selfcheck.ts
import assert from 'node:assert';
import { computeRiderStats } from './riderStats.js';

// Zero orders → completion 100%, default rating 5, all counts zero.
let s = computeRiderStats({ deliveredCount: 0, failedCount: 0, ratings: [] });
assert.equal(s.completionRate, 100);
assert.equal(s.averageRating, 5);
assert.equal(s.deliveries, 0);
assert.equal(s.totalAttempted, 0);
assert.equal(s.ratingCount, 0);

// delivered=8 failed=2 → 80% completion, 8 deliveries, 10 attempted.
s = computeRiderStats({ deliveredCount: 8, failedCount: 2, ratings: [] });
assert.equal(s.completionRate, 80);
assert.equal(s.deliveries, 8);
assert.equal(s.totalAttempted, 10);

// ratings [5,4,4] → (13/3) rounds to 4.33, count 3.
s = computeRiderStats({ deliveredCount: 3, failedCount: 0, ratings: [5, 4, 4] });
assert.equal(s.averageRating, 4.33);
assert.equal(s.ratingCount, 3);

// No reviews → default 5.00, count 0 (even with real deliveries).
s = computeRiderStats({ deliveredCount: 5, failedCount: 0, ratings: [] });
assert.equal(s.averageRating, 5);
assert.equal(s.ratingCount, 0);

console.log('riderStats.selfcheck OK');
