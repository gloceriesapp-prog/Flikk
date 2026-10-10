// Runnable self-check for computeColdStartDone. No framework:
// `npx tsx src/navigation/coldStart.selfcheck.ts` from apps/partner.
import assert from 'node:assert';
import { computeColdStartDone } from './coldStart';

const MIN = 650;

// Not hydrated yet, floor elapsed → still cold (hydration is the gate).
assert.equal(computeColdStartDone({ hydrated: false, elapsedMs: MIN + 10, minMs: MIN }), false, 'unhydrated must stay cold even past the floor');

// Hydrated but floor not reached → still cold (no splash flash).
assert.equal(computeColdStartDone({ hydrated: true, elapsedMs: MIN - 1, minMs: MIN }), false, 'hydrated-before-floor must stay cold until floor');

// Hydrated and floor exactly reached → done.
assert.equal(computeColdStartDone({ hydrated: true, elapsedMs: MIN, minMs: MIN }), true, 'floor reached + hydrated = done');

// Hydrated and well past floor → done.
assert.equal(computeColdStartDone({ hydrated: true, elapsedMs: MIN * 3, minMs: MIN }), true, 'hydrated past floor = done');

// Neither → cold.
assert.equal(computeColdStartDone({ hydrated: false, elapsedMs: 0, minMs: MIN }), false, 'cold open start');

console.log('coldStart.selfcheck: all cases OK');
