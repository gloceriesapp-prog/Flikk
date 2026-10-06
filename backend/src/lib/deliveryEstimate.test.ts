import { describe, expect, it } from 'vitest';
import { deliveryMinutes, estimateDeliveryTime } from '../../../apps/customer/src/utils/estimateDelivery';
import { getPurchaseArrivalLabel } from '../../../apps/customer/src/screens/purchase/orderArrival';
import type { PurchaseOrder } from '../../../apps/customer/src/screens/purchase/data';

describe('recorded delivery estimates', () => {
  const placedAt = '2026-10-04T10:00:00Z';
  const deadline = '2026-10-04T10:30:00.000Z';
  it('accepts whole minutes and consistently falls back for invalid values', () => {
    expect(deliveryMinutes(1)).toBe(1);
    expect(deliveryMinutes(240)).toBe(240);
    for (const value of [undefined, null, 0, -1, 241, 1.5, NaN, Infinity]) {
      expect(deliveryMinutes(value)).toBe(35);
    }
  });
  it('prefers the recorded deadline over a subsequently changed setting', () => {
    expect(estimateDeliveryTime(placedAt, 60, deadline).toISOString()).toBe(deadline);
  });
  it('uses the recorded minutes from placement when a deadline is absent', () => {
    expect(estimateDeliveryTime(placedAt, 30).toISOString()).toBe(deadline);
  });
  it('uses a fixed legacy fallback and never extends it from the current time', () => {
    expect(estimateDeliveryTime(placedAt).toISOString()).toBe('2026-10-04T10:35:00.000Z');
    expect(Number.isNaN(estimateDeliveryTime('invalid').getTime())).toBe(true);
  });
  it('counts down from placement even if dispatch happens later and stops at zero', () => {
    const order = { status: 'out_for_delivery', placedAtIso: placedAt,
      estimatedDeliveryMinutes: 30, estimatedDeliveryAt: deadline } as PurchaseOrder;
    expect(getPurchaseArrivalLabel(order, Date.parse(placedAt))).toBe('Arriving in 30 minutes');
    expect(getPurchaseArrivalLabel(order, Date.parse('2026-10-04T10:20:00Z'))).toBe('Arriving in 10 minutes');
    expect(getPurchaseArrivalLabel(order, Date.parse('2026-10-04T11:00:00Z'))).toBe('Arriving in 0 minutes');
    expect(getPurchaseArrivalLabel({ ...order, status: 'packed' })).toBe('Packing your order');
  });
});
