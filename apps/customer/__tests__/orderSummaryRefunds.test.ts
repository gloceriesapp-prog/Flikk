import type { ApiOrder } from '../src/api/orders';
import type { ApiTrip } from '../src/api/trips';
import { buildOrderSummary } from '../src/screens/order-summary/data';
jest.mock('../src/screens/purchase/data', () => ({ mapOrderGroup: () => ({}) }));
jest.mock('../src/screens/order-summary/utils/calculateOrderBill', () => ({ calculateOrderBill: () => ({}) }));
const order = { id: 'order-one', order_items: [], refund_status: 'processing', provider_refund_id: null, placed_at: '2026-11-13', order_number: 'GLO-test' } as unknown as ApiOrder;
test('retains refund state and target for the customer order summary', () => {
 expect(buildOrderSummary(order)?.refunds).toEqual([{ targetId: 'order-one', kind: 'order', status: 'processing', providerRefundId: null }]);
 expect(buildOrderSummary({ ...order, refund_status: 'none' })?.refunds).toEqual([]);
});
test('shows a combined trip refund once instead of duplicating it for each shop', () => {
 const trip = { id: 'trip-one', orders: [{...order,provider_refund_id:'rfnd_one'}, {...order,id:'order-two'}], cancellation_refund: {status:'processing'} } as unknown as ApiTrip;
 expect(buildOrderSummary(undefined,trip)?.refunds).toEqual([{ targetId:'trip-one',kind:'trip',status:'processing',providerRefundId:'rfnd_one' }]);
});
