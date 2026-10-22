import { expect, it } from 'vitest';
import { orderSummaryData, durationLabel } from '../../../apps/partner-dashboard/src/components/orders/orderSummaryData';
import type { PartnerOrder } from '../../../apps/partner-dashboard/src/lib/partnerApi';
const now = Date.parse('2026-10-19T06:00:00Z');
const order = (patch: Partial<PartnerOrder> = {}) => ({ id: 'one', order_number: 'FLK-1', status: 'placed', placed_at: '2026-10-19T05:00:00Z', store_visible_at: '2026-10-19T05:01:00Z', item_total: 100, ...patch }) as PartnerOrder;
it('measures acceptance from store visibility and packing from acceptance', () => {
  const result = orderSummaryData([order({ accepted_at: '2026-10-19T05:02:40Z', packed_at: '2026-10-19T05:09:40Z', status: 'packed' })], now);
  expect(result.acceptMs).toBe(100_000); expect(result.packMs).toBe(420_000);
  expect(durationLabel(result.acceptMs)).toBe('1m 40s'); expect(durationLabel(result.packMs)).toBe('7 min');
});
it('does not invent timing for unaccepted orders or invalid timestamp pairs', () => {
  const result = orderSummaryData([order(), order({ accepted_at: 'invalid', packed_at: 'invalid' })], now);
  expect(result.acceptMs).toBeNull(); expect(result.packMs).toBeNull(); expect(durationLabel(null)).toBe('—');
});
it('uses IST today and compares yesterday only up to the same time', () => {
  const result = orderSummaryData([order(), order({ placed_at: '2026-10-18T20:00:00Z' }), order({ placed_at: '2026-10-18T05:00:00Z' }), order({ placed_at: '2026-10-18T08:00:00Z' })], now);
  expect(result.count).toBe(2); expect(result.growth).toBe(100);
});
it('counts cancellation reasons and excludes cancelled sales and delivery fees', () => {
  const result = orderSummaryData([order(), order({ status: 'cancelled', cancel_reason: 'store_out_of_stock' })], now);
  expect(result.sales).toBe(100); expect(result.averageValue).toBe(100); expect(result.cancelRate).toBe(50); expect(result.cancelReasons).toBe('1 out of stock');
});
