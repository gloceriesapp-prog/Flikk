// Real order history for the Purchase tab — mapped from ApiOrder
// (api/orders.ts, GET /orders) into this screen's own display shape.
// PurchaseOrder.id is the real order_number ("FLK-100042"), shown to the
// customer; orderId is the real UUID PK, used only for navigation
// (TrackOrder's own route param, GET /orders/:id).

import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import type { ApiOrder } from '../../api/orders';

export interface OrderItemSummary {
  name: string;
  imageUri: string;
}

export interface PurchaseOrder {
  id: string; // display order_number
  orderId: string; // real UUID — TrackOrder navigation target
  status: 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  storeName: string;
  items: OrderItemSummary[];
  statusLabel: string;
  etaLabel: string;
  placedAtLabel: string;
  total: number;
}

const STATUS_LABEL: Record<PurchaseOrder['status'], string> = {
  placed: 'Order Placed',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function formatRelativeDateTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

export function mapApiOrder(order: ApiOrder): PurchaseOrder {
  const status = order.status;
  const deliveredOrCancelled = status === 'delivered' || status === 'cancelled';
  const timestamp = order.delivered_at ?? order.picked_up_at ?? order.packed_at ?? order.placed_at;

  return {
    id: order.order_number,
    orderId: order.id,
    status,
    storeName: order.stores?.name ?? 'Store',
    items: order.order_items.map((item) => ({
      name: item.products?.name ?? 'Item',
      imageUri: item.products?.image_url ?? PLACEHOLDER_IMAGE_URI,
    })),
    statusLabel: STATUS_LABEL[status],
    etaLabel: deliveredOrCancelled ? `${STATUS_LABEL[status]} at ${formatRelativeDateTime(timestamp)}` : 'Your order is on its way',
    // PastOrderCard shows this next to statusLabel ("Delivered · <label>") —
    // the terminal-status timestamp (delivered/cancelled), not when the
    // order was placed, same as every real delivery app's own history list.
    placedAtLabel: formatRelativeDateTime(timestamp),
    total: order.total,
  };
}
