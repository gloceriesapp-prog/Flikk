// ponytail: one runnable self-check for parseAdminBroadcast — the admin
// fleet-broadcast payload contract (backend/src/lib/fleetPush.ts). Guards that
// a backend enum change (new audience, renamed kind/type) is caught here rather
// than silently mis-handled on a rider device.
// Run: npx tsx apps/rider/src/features/push-notifications/adminBroadcast.selfcheck.ts
import assert from 'node:assert';
import { parseAdminBroadcast } from './adminBroadcast';

// Both rider audiences parse, carrying kind 'rider'.
assert.deepEqual(parseAdminBroadcast({ type: 'admin_message', kind: 'rider', audience: 'all_riders' }), {
  kind: 'rider',
  audience: 'all_riders',
});
assert.deepEqual(parseAdminBroadcast({ type: 'admin_message', kind: 'rider', audience: 'online_riders' }), {
  kind: 'rider',
  audience: 'online_riders',
});
// Partner broadcast parses too (kind 'partner') — a rider device never receives
// one, but the shape must still be recognized, not thrown.
assert.deepEqual(parseAdminBroadcast({ type: 'admin_message', kind: 'partner', audience: 'partners' }), {
  kind: 'partner',
  audience: 'partners',
});

// Not a broadcast: order push, customer notification, missing/old/garbage data.
assert.equal(parseAdminBroadcast({ type: 'new_order', orderId: 'o1' }), null);
assert.equal(parseAdminBroadcast({ type: 'admin_message', kind: 'customer', audience: 'all_customers' }), null);
assert.equal(parseAdminBroadcast({ type: 'admin_message', kind: 'rider', audience: 'all_customers' }), null);
assert.equal(parseAdminBroadcast({ type: 'admin_message', kind: 'rider' }), null); // no audience
assert.equal(parseAdminBroadcast({ type: 'admin_message', audience: 'all_riders' }), null); // no kind
assert.equal(parseAdminBroadcast({ type: 'admin_message', kind: 'driver', audience: 'all_riders' }), null); // bad kind
assert.equal(parseAdminBroadcast(null), null);
assert.equal(parseAdminBroadcast(undefined), null);
assert.equal(parseAdminBroadcast('admin_message'), null);
assert.equal(parseAdminBroadcast(42), null);

console.log('adminBroadcast self-check ok');
