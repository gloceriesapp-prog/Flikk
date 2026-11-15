import type { OrderSummary } from '../../api/orders';

export const ORDER_HISTORY_FILTERS: { label: string; status?: OrderSummary['status'] }[] = [
  { label: 'All' },
  { label: 'Delivered', status: 'delivered' },
  { label: 'Cancelled', status: 'cancelled' },
  { label: 'New', status: 'placed' },
  { label: 'Packed', status: 'packed' },
  { label: 'On the way', status: 'out_for_delivery' },
  { label: 'Delivery issues', status: 'failed' },
];
export const ORDER_STATUS_LABELS: Record<OrderSummary['status'], string> = {
  placed: 'New', packed: 'Packed', out_for_delivery: 'On the way',
  delivered: 'Delivered', cancelled: 'Cancelled', failed: 'Delivery issue',
};
// Cursor pages can overlap when an order changes while more history is loaded.
export function uniqueHistoryOrders(pages: readonly { items: OrderSummary[] }[]): OrderSummary[] {
  const seen = new Set<string>();
  return pages.flatMap(page => page.items).filter(order => {
    if (seen.has(order.id)) return false;
    seen.add(order.id);
    return true;
  });
}
