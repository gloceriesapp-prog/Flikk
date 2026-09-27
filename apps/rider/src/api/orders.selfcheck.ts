// ponytail: one runnable self-check for toRiderOrder's non-trivial mapping —
// store address precedence + the line1 / landmark / deliveryNote split, and
// that the drop pin still comes from the live customer coords, not text.
// Run: npx tsx apps/rider/src/api/orders.selfcheck.ts
import assert from 'node:assert';
import { toRiderOrder } from './orders';

function raw(overrides: any = {}) {
  return {
    id: 'abcdef0000',
    status: 'out_for_delivery',
    placed_at: '2026-09-26T00:00:00Z',
    delivered_at: null,
    cancel_reason: null,
    trip_id: null,
    trips: null,
    order_items: [],
    stores: { name: 'Kirana', phone: null, lat: 13.2, lng: 74.7, manual_address: 'Near Bus Stand', address_line: 'MG Rd geocoded', zones: { name: 'Kaup' } },
    users: { name: 'Asha', phone: '9' },
    addresses: { line1: 'Flat 3, Green Apt', landmark: 'Blue gate', latitude: 13.21, longitude: 74.71, delivery_instructions: 'Call on arrival' },
    ...overrides,
  };
}

// Store address: owner-typed manual_address wins.
let o = toRiderOrder(raw())!;
assert.equal(o.storeAddress, 'Near Bus Stand');
// No manual_address → reverse-geocoded line, then zone name.
o = toRiderOrder(raw({ stores: { ...raw().stores, manual_address: null } }))!;
assert.equal(o.storeAddress, 'MG Rd geocoded');
o = toRiderOrder(raw({ stores: { ...raw().stores, manual_address: null, address_line: null } }))!;
assert.equal(o.storeAddress, 'Kaup');

// Customer: address / landmark / note stay SEPARATE (not joined).
o = toRiderOrder(raw())!;
assert.equal(o.customerAddress, 'Flat 3, Green Apt');
assert.equal(o.landmark, 'Blue gate');
assert.equal(o.deliveryNote, 'Call on arrival');
// Drop pin = live customer coords, never derived from address text.
assert.deepEqual(o.customerCoords, { latitude: 13.21, longitude: 74.71 });

// Missing optional landmark/note → undefined, not "".
o = toRiderOrder(raw({ addresses: { line1: 'X', landmark: null, latitude: 1, longitude: 2, delivery_instructions: null } }))!;
assert.equal(o.landmark, undefined);
assert.equal(o.deliveryNote, undefined);

console.log('orders.selfcheck OK');
