import { getPurchaseArrivedInLabel } from '../src/screens/purchase/orderArrival';
import type { PurchaseOrder } from '../src/screens/purchase/data';

const order = (over: Partial<PurchaseOrder>): PurchaseOrder => ({
  id: 'GLO-1', orderId: 'o1', isTrip: false, status: 'delivered', storeId: 's1', storeName: 'Store',
  items: [], statusLabel: 'Delivered', etaLabel: '', placedAtLabel: '', total: 100,
  placedAtIso: '2026-11-17T10:00:00.000Z', avgPrepMinutes: null, ...over,
});

it('shows how long a delivered order took', () => {
  expect(getPurchaseArrivedInLabel(order({ deliveredAtIso: '2026-11-17T10:18:20.000Z' }))).toBe('Arrived in 18 minutes');
  expect(getPurchaseArrivedInLabel(order({ deliveredAtIso: '2026-11-17T10:00:30.000Z' }))).toBe('Arrived in 1 minute');
  expect(getPurchaseArrivedInLabel(order({ deliveredAtIso: '2026-11-17T11:05:00.000Z' }))).toBe('Arrived in 1 hr 5 min');
  expect(getPurchaseArrivedInLabel(order({ deliveredAtIso: '2026-11-17T12:00:00.000Z' }))).toBe('Arrived in 2 hr');
});

it('falls back to the delivered label without a usable duration', () => {
  expect(getPurchaseArrivedInLabel(order({ deliveredAtIso: null }))).toBe('Delivered');
  expect(getPurchaseArrivedInLabel(order({ deliveredAtIso: '2026-11-18T08:00:00.000Z', preorderWindow: 'Wed 18 Nov, 7–9 AM' })))
    .toMatch(/^Delivered at /);
});
