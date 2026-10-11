// ponytail: one runnable self-check for the fleet-push pure logic — the enum
// guard, audience->kind routing, input bounds, and the Expo message shaping
// (dedup, blank-token drop, payload). Run: npx tsx src/lib/fleetPush.selfcheck.ts
import assert from 'node:assert/strict';
import { isFleetAudience, fleetPushKind, fleetPushMessages, validateFleetPushInput } from './fleetPush';

// Enum guard.
for (const a of ['all_riders', 'online_riders', 'partners']) assert.equal(isFleetAudience(a), true);
for (const a of ['customer', 'all_customers', '', 'rider', null, 42]) assert.equal(isFleetAudience(a), false);

// kind: partners -> partner, both rider audiences -> rider.
assert.equal(fleetPushKind('partners'), 'partner');
assert.equal(fleetPushKind('all_riders'), 'rider');
assert.equal(fleetPushKind('online_riders'), 'rider');

// Validation: happy path trims.
const ok = validateFleetPushInput({ audience: 'all_riders', title: '  Heads up  ', body: '  Rain delay  ' });
assert.equal(ok.ok, true);
assert.deepEqual(ok.ok && ok.value, { audience: 'all_riders', title: 'Heads up', body: 'Rain delay' });

// Validation: bad audience, empty/oversize title+body.
assert.equal(validateFleetPushInput({ audience: 'all_customers', title: 'x', body: 'y' }).ok, false);
assert.equal(validateFleetPushInput({ audience: 'partners', title: '', body: 'y' }).ok, false);
assert.equal(validateFleetPushInput({ audience: 'partners', title: 'a'.repeat(81), body: 'y' }).ok, false);
assert.equal(validateFleetPushInput({ audience: 'partners', title: 'a', body: 'b'.repeat(241) }).ok, false);
assert.equal(validateFleetPushInput({ audience: 'partners', title: 'a', body: '' }).ok, false);

// Messages: dedup + drop blanks/nulls, one per unique token, correct payload.
const msgs = fleetPushMessages(['t1', 't1', '', 't2', null, undefined], 'online_riders', 'T', 'B');
assert.equal(msgs.length, 2);
assert.deepEqual(msgs.map((m) => m.to).sort(), ['t1', 't2']);
assert.deepEqual(msgs[0], {
  to: 't1',
  title: 'T',
  body: 'B',
  sound: 'default',
  priority: 'high',
  data: { type: 'admin_message', kind: 'rider', audience: 'online_riders' },
});

// Empty token list -> no messages (RPC still recorded the audited row).
assert.equal(fleetPushMessages([], 'partners', 'T', 'B').length, 0);

console.log('fleetPush.selfcheck OK');
