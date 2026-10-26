import assert from 'node:assert/strict';
import { packingLabel, readyAtOf } from './storePacking';

const now = Date.parse('2026-10-26T10:00:00Z');
assert.equal(packingLabel(null, now), 'Store is packing');
assert.equal(packingLabel(now + 4 * 60_000 + 1, now), 'Store is packing · ready in ~5 min');
assert.equal(packingLabel(now + 60_000, now), 'Store is packing · ready in ~1 min');
assert.equal(packingLabel(now - 30_000, now), 'Store is packing · almost ready');
assert.equal(readyAtOf('2026-10-26T10:05:00Z'), now + 5 * 60_000);
assert.equal(readyAtOf(null), null);
assert.equal(readyAtOf('not a date'), null);
console.log('storePacking selfcheck passed');
