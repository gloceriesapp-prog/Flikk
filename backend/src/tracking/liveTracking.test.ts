import { expect, it } from 'vitest';
import { liveFinished, mergeOrder, mergeTrip, needsOrderDetails } from '../../../apps/customer/src/screens/track-order/state/liveTracking';
import type { ApiOrder } from '../../../apps/customer/src/api/orders';
import type { ApiTrip } from '../../../apps/customer/src/api/trips';
import type { OrderLive, TripLive } from '../../../apps/customer/src/api/tracking';
const details = { id: 'order', live_revision: 2, status: 'packed', rider_id: null, order_items: [{ id: 'item' }], addresses: { line1: 'private address' } } as unknown as ApiOrder;
it('merges live status while preserving item/address details', () => {
  const live = { id: 'order', live_revision: 3, status: 'out_for_delivery', rider_id: 'new' } as OrderLive;
  const result = mergeOrder(details, live)!;
  expect(result.order_items).toBe(details.order_items); expect(result.addresses).toBe(details.addresses);
  expect(result.status).toBe('out_for_delivery'); expect(result.riders).toBeNull(); expect(needsOrderDetails(details, live)).toBe(true);
});
it('late polls cannot undo a newer cancellation or rider assignment', () => {
  const live = { id: 'order', live_revision: 1, status: 'placed', rider_id: 'old' } as OrderLive;
  expect(mergeOrder(details, live)).toBe(details); expect(needsOrderDetails(details, live)).toBe(false);
});
it('trip child versions can advance independently of the trip parent', () => {
  const trip = { id: 'trip', live_revision: 3, status: 'cancelled', orders: [details] } as ApiTrip;
  const live = { id: 'trip', live_revision: 2, status: 'placed', orders: [{ ...details, live_revision: 4, status: 'delivered' }] } as TripLive;
  const result = mergeTrip(trip, live)!; expect(result.status).toBe('cancelled'); expect(result.orders![0]!.status).toBe('delivered');
});
it('stops terminal polling but continues until pending refunds settle', () => {
  const live = { id: 'order', status: 'delivered', refund_status: 'none' } as OrderLive;
  expect(liveFinished(live)).toBe(true); expect(liveFinished({ ...live, refund_status: 'processing' })).toBe(false);
  expect(liveFinished({ id: 'trip', orders: [live], cancellation_refund: { status: 'queued' } } as TripLive)).toBe(false);
  expect(liveFinished({ id: 'trip', orders: [] } as unknown as TripLive)).toBe(false);
});

it('does not loop full-detail requests when a rider response has not caught up', async () => {
  const { DetailRefreshGate, detailRefreshKey } = await import('../../../apps/customer/src/screens/track-order/state/liveTracking');
  const gate = new DetailRefreshGate();
  const first = detailRefreshKey('order', 'customer', false, 1000);
  expect(gate.allow(first, true, true)).toBe(false);
  expect(gate.allow(first, true, false)).toBe(true);
  expect(gate.allow(first, true, false)).toBe(false);
  const retry = detailRefreshKey('order', 'customer', false, 2000);
  expect(gate.allow(retry, true, false)).toBe(true);
  expect(gate.allow(detailRefreshKey('other', 'customer', false, 2000), false, false)).toBe(false);
});
it('ignores an old or foreign trip leg set while allowing newer rider details', async () => {
  const { needsTripDetails } = await import('../../../apps/customer/src/screens/track-order/state/liveTracking');
  const trip = { id: 'trip', live_revision: 5, orders: [details] } as ApiTrip;
  expect(needsTripDetails(trip, { id: 'other', live_revision: 9, orders: [] } as unknown as TripLive)).toBe(false);
  expect(needsTripDetails(trip, { id: 'trip', live_revision: 4, orders: [] } as unknown as TripLive)).toBe(false);
  expect(needsTripDetails(trip, { id: 'trip', live_revision: 5, orders: [{ ...details, live_revision: 9, rider_id: 'assigned' }] } as TripLive)).toBe(true);
});

it('does not stop polling based on an older completed-refund response', () => {
  const latest = { ...details, live_revision: 9, status: 'cancelled', refund_status: 'processing' } as ApiOrder;
  const old = { ...latest, live_revision: 8, refund_status: 'completed' } as OrderLive;
  expect(liveFinished(mergeOrder(latest, old)!)).toBe(false);
});
it('advances a late detail response exactly once without a cache-update loop', async () => {
  const { orderCanAdvance, tripCanAdvance } = await import('../../../apps/customer/src/screens/track-order/state/liveTracking');
  const live = { ...details, live_revision: 4, status: 'out_for_delivery', rider_id: null } as OrderLive;
  expect(orderCanAdvance(details, live)).toBe(true);
  expect(orderCanAdvance(mergeOrder(details, live), live)).toBe(false);
  const trip = { id: 'trip', live_revision: 5, orders: [details] } as ApiTrip;
  const update = { id: 'trip', live_revision: 5, orders: [live] } as TripLive;
  expect(tripCanAdvance(trip, update)).toBe(true);
  expect(tripCanAdvance(mergeTrip(trip, update), update)).toBe(false);
});
