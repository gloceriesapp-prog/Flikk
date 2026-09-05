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
  // Real order.placed_at (ISO) + the store's own avg_prep_minutes — what
  // OrderRow.tsx feeds into estimateDeliveryTime (utils/estimateDelivery.ts,
  // the same real ETA math TrackOrderScreen/ReceiptScreen already use) to
  // show "Arriving in X min" for a still-in-progress order, instead of a
  // static status word. null avgPrepMinutes is valid — that util already
  // falls back to a default prep time.
  placedAtIso: string;
  avgPrepMinutes: number | null;
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

// Preview-only sample orders — so the ItemThumbnailStack 3-item and 4+-item
// (2 photos + "+N" badge) cases are actually visible without needing real
// backend orders with that many line items. Rendered by PurchaseScreen.tsx
// alongside whatever real orders GET /orders returns; remove this export
// (and its one call site) once the design's confirmed — these aren't real
// orders, just a way to see the stack logic on screen.
function sampleItem(name: string): OrderItemSummary {
  return { name, imageUri: PLACEHOLDER_IMAGE_URI };
}

const PREVIEW_PLACED_AT = new Date(Date.now() - 5 * 60_000).toISOString(); // 5 min ago
const PREVIEW_DELIVERED_AT = new Date(Date.now() - 26 * 60 * 60_000).toISOString(); // yesterday

export const SAMPLE_PREVIEW_ORDERS: PurchaseOrder[] = [
  {
    id: 'FLK-PREVIEW-3',
    orderId: 'preview-3-items',
    status: 'packed',
    storeName: 'Preview Store',
    items: [sampleItem('Onion'), sampleItem('Tomato'), sampleItem('Carrot')],
    statusLabel: 'Packed',
    etaLabel: 'Your order is on its way',
    placedAtLabel: 'Today, 12:00 PM',
    total: 120,
    placedAtIso: PREVIEW_PLACED_AT,
    avgPrepMinutes: 15,
  },
  {
    id: 'FLK-PREVIEW-5',
    orderId: 'preview-5-items',
    status: 'placed',
    storeName: 'Preview Store',
    items: [
      sampleItem('Onion'),
      sampleItem('Tomato'),
      sampleItem('Carrot'),
      sampleItem('Potato'),
      sampleItem('Spinach'),
    ],
    statusLabel: 'Order Placed',
    etaLabel: 'Your order is on its way',
    placedAtLabel: 'Today, 12:05 PM',
    total: 245,
    placedAtIso: PREVIEW_PLACED_AT,
    avgPrepMinutes: 15,
  },
  // Delivered — so the "Past" group (OrderRow's own ink-colored,
  // non-tappable "Delivered" headline) is actually visible on screen
  // alongside the two live previews above, not just live statuses.
  {
    id: 'FLK-PREVIEW-DELIVERED',
    orderId: 'preview-delivered',
    status: 'delivered',
    storeName: 'Preview Store',
    items: [sampleItem('Onion'), sampleItem('Tomato')],
    statusLabel: 'Delivered',
    etaLabel: 'Delivered at Yesterday, 06:30 PM',
    placedAtLabel: 'Yesterday, 06:30 PM',
    total: 90,
    placedAtIso: PREVIEW_DELIVERED_AT,
    avgPrepMinutes: 15,
  },
];

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
    placedAtIso: order.placed_at,
    avgPrepMinutes: order.stores?.avg_prep_minutes ?? order.avg_prep_minutes ?? null,
  };
}
