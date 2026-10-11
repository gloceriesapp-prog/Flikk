// ponytail: one runnable self-check for the dispatch-map shaping — the
// online+fresh+has-coordinate rider filter and the store/customer pin
// extraction (including Supabase's object-or-array embed shape and missing
// coordinates). Run: npx tsx src/lib/dispatchMap.selfcheck.ts
import assert from 'node:assert';
import { toMapRiders, toMapOrders, type RiderRow, type OrderRow } from './dispatchMap';
import { FRESH_PING_MS } from './riderPresence';

const now = Date.UTC(2026, 0, 1, 12, 0, 0);
const fresh = new Date(now - 60 * 1000).toISOString(); // 1 min ago
const stale = new Date(now - FRESH_PING_MS - 1000).toISOString(); // just over window

const riderRows: RiderRow[] = [
  { id: 'a', name: 'Online fresh', status: 'online', current_lat: 13.1, current_lng: 74.7, last_location_update: fresh },
  { id: 'b', name: 'Online stale', status: 'online', current_lat: 13.1, current_lng: 74.7, last_location_update: stale },
  { id: 'c', name: 'Offline fresh', status: 'offline', current_lat: 13.1, current_lng: 74.7, last_location_update: fresh },
  { id: 'd', name: 'Online no coord', status: 'online', current_lat: null, current_lng: 74.7, last_location_update: fresh },
  { id: 'e', name: 'Online never pinged', status: 'online', current_lat: 13.1, current_lng: 74.7, last_location_update: null },
];

const riders = toMapRiders(riderRows, now);
assert.equal(riders.length, 1, 'only the online, fresh, coordinate-bearing rider is plotted');
assert.equal(riders[0].id, 'a');
assert.deepEqual(riders[0], { id: 'a', name: 'Online fresh', lat: 13.1, lng: 74.7 });

const orderRows: OrderRow[] = [
  // Supabase embed as object.
  { id: 'o1', status: 'packed', store: { name: 'Kirana', lat: 13.2, lng: 74.8 }, address: { latitude: 13.21, longitude: 74.81 } },
  // Supabase embed as single-element array.
  { id: 'o2', status: 'placed', store: [{ name: 'Pharmacy', lat: 13.3, lng: 74.9 }], address: [{ latitude: 13.31, longitude: 74.91 }] },
  // Missing coordinates → null pins, not dropped, name falls back.
  { id: 'o3', status: 'out_for_delivery', store: { name: null, lat: null, lng: null }, address: null },
];

const orders = toMapOrders(orderRows);
assert.equal(orders.length, 3);
assert.deepEqual(orders[0].store, { lat: 13.2, lng: 74.8 });
assert.deepEqual(orders[0].customer, { lat: 13.21, lng: 74.81 });
assert.equal(orders[0].storeName, 'Kirana');
assert.deepEqual(orders[1].store, { lat: 13.3, lng: 74.9 }, 'array embed normalised to one');
assert.equal(orders[1].storeName, 'Pharmacy');
assert.equal(orders[2].store, null, 'missing store coords → null pin');
assert.equal(orders[2].customer, null, 'null address → null pin');
assert.equal(orders[2].storeName, 'Store', 'null name falls back');

console.log('dispatchMap.selfcheck OK');
