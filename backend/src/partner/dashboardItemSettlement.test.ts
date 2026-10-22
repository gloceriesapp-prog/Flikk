import { expect, it } from 'vitest';
import { orderItemSettlement } from '../../../apps/partner-dashboard/src/lib/orderRevenue';
it('uses items only and the historical commission, preserving paise', () => {
  const order = { item_total: 358, commission_amount: 35.8, total: 378, delivery_fee: 20, status: 'placed' as const };
  expect(orderItemSettlement(order)).toEqual({ itemsTotal: 358, commission: 35.8, commissionPercent: 10, receivable: 322.2 });
});
it('does not divide by zero for empty orders', () => {
  expect(orderItemSettlement({ item_total: 0, commission_amount: 0, status: 'placed' })).toEqual({ itemsTotal: 0, commission: 0, commissionPercent: null, receivable: 0 });
});
it('shows no receivable for cancelled orders', () => {
  expect(orderItemSettlement({ item_total: 358, commission_amount: 35.8, status: 'cancelled' }).receivable).toBe(0);
});
