// Runnable self-check for admin fleet-broadcast payload recognition. No
// framework: `npx tsx src/features/push-notifications/adminBroadcast.selfcheck.ts`
// from apps/partner. Pins the exact `data` shape the backend sends
// (backend/src/lib/fleetPush.ts) so an app/API drift is caught here.
import assert from 'node:assert';
import { isAdminBroadcast } from './adminBroadcast';

// The exact partner-audience payload the backend emits.
assert.equal(
  isAdminBroadcast({ type: 'admin_message', kind: 'partner', audience: 'partners' }),
  true,
  'partner broadcast must be recognised',
);

// Rider-kind payloads share the discriminator — recognised as a broadcast too
// (this app only receives partner kind, but the guard keys off `type`).
assert.equal(
  isAdminBroadcast({ type: 'admin_message', kind: 'rider', audience: 'online_riders' }),
  true,
  'rider-kind broadcast is still an admin_message',
);

// An order push is NOT a broadcast — must not short-circuit the tap router.
assert.equal(isAdminBroadcast({ type: 'new_order', orderId: 'o1' }), false, 'order push is not a broadcast');
assert.equal(isAdminBroadcast({ orderId: 'o1' }), false, 'order-id-only push is not a broadcast');

// Garbage / missing data must be rejected without throwing.
assert.equal(isAdminBroadcast(undefined), false, 'undefined is not a broadcast');
assert.equal(isAdminBroadcast(null), false, 'null is not a broadcast');
assert.equal(isAdminBroadcast('admin_message'), false, 'a bare string is not a broadcast');
assert.equal(isAdminBroadcast({}), false, 'an empty object is not a broadcast');
assert.equal(isAdminBroadcast({ type: 'something_else' }), false, 'a different type is not a broadcast');

console.log('adminBroadcast.selfcheck: all cases OK');
