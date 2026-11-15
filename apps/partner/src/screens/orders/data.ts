// Merchant order view models retain the server purchase and lifecycle snapshots.
// Real order queue now — mapApiOrder converts one GET /partner/orders row
// (api/orders.ts's own ApiOrder) into this screen's display shape.
// Queue pages are bounded. Customer lifetime order counts cannot be inferred
// from this data and are deliberately not displayed in order details.

import type { ApiOrder } from '../../api/orders';

// Chilled / room temperature the customer chose (order_items.serving).
const SERVING_LABEL = { chilled: 'Chilled', room_temperature: 'Room temperature' } as const;

export type PartnerOrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';

export interface OrderLineItem {
  name: string;
  quantity: number;
  unit: string;
  // Line price (quantity already factored in) — shown per-item in
  // OrderDetailScreen's item list. Sums to PartnerOrder.total.
  price: number;
  // Real products.image_url — ItemAvatarStack's own note on why this
  // replaces the shared PLACEHOLDER_IMAGE_URI stand-in it used to always
  // show regardless of whether a product actually had a photo.
  imageUrl: string | null;
}

export interface PartnerOrder {
  // Bulk chicken order (orders.is_bulk) — badge on the card and detail.
  isBulk?: boolean;
  // Pre-order delivery window, e.g. "Sat 7 Nov, 7:00 – 9:00 AM".
  preorderWindow?: string;
  // Real orders.id (UUID) — what PATCH /orders/:id/status and every
  // action callback (markPacked, rejectOrder, acknowledgeOrder) actually
  // use. Never rendered as text — orderNumber is what's shown.
  id: string;
  // Real orders.order_number ("GLO-6691-1885") — what OrderCard/
  // OrderDetailScreen display instead of the raw UUID above.
  orderNumber: string;
  customerName: string;
  items: OrderLineItem[];
  total: number;
  // Real orders.item_total/commission_amount (api/orders.ts's ApiOrder,
  // backend's own COMMISSION_RATE) — netPayout = itemTotal - commissionAmount,
  // never order.total - commission: delivery fee is never store revenue,
  // so commission is only ever taken off the item total, matching exactly
  // how backend/src/routes/orders.ts itself computes commission_amount at
  // order-creation time (calcCommission(itemTotal, COMMISSION_RATE), never
  // against the full order total).
  itemTotal: number;
  commissionAmount: number;
  netPayout: number;
  status: PartnerOrderStatus;
  placedAtLabel: string;
  // Absolute clock time, distinct from the relative queue label.
  placedAtTime: string;
  // Legacy sample-model field: local page position, never a lifetime count.
  orderCount: number;
  // What the store owner must do about payment when the order goes out —
  // the real-money/operational instruction shown up top in
  // OrderDetailScreen. Driven off the authoritative orders.payment_method
  // (cod vs online) plus provider_payment_id (whether an online payment has
  // settled), NEVER a provider_payment_id-only guess:
  //   'cod'              — customer pays cash on delivery, owner collects it
  //   'paid_online'      — online payment already settled, nothing to collect
  //   'awaiting_payment' — online order whose payment hasn't settled; owner
  //                        must NOT collect cash (it is not a COD order)
  paymentMode: 'cod' | 'paid_online' | 'awaiting_payment';
  // Two-line drop-off — shown on the incoming-order alert's "Deliver to"
  // section (features/incoming-order-alert/). Not the full addresses
  // table shape from specs/00-foundation/data-model.md (label, landmark,
  // zone_id) — just the two lines a store owner actually needs to read at
  // a glance before accepting.
  deliveryAddress: [string, string];
  // Real tel: number — the alert's call button actually dials this via
  // Linking.openURL, not a stub. A store owner deciding whether to accept
  // an order sometimes needs to reach the customer before committing to
  // it (address unclear, item substitution question), not only after.
  customerPhone: string;
  // Epoch ms — the anchor for the total accept window
  // (features/order-expiry/orderExpiry.ts's getOrderAcceptWindowMs), not
  // derivable from placedAtLabel ("2 min ago" isn't a timestamp) or
  // placedAtTime ("12:40 pm" has no date and drifts stale by the next
  // day). A real fetch populates this from orders.placed_at.
  placedAtTimestamp: number;
  acceptedAtTimestamp?: number;
  acceptanceDeadlineTimestamp?: number;
  preparationDeadlineTimestamp?: number;
  // Epoch ms the order reached the store (orders.store_visible_at: checkout
  // for COD, payment for online) — the accept window's start, same anchor as
  // the backend's store_no_response job. Undefined for sample rows / older
  // backends, which fall back to placedAtTimestamp.
  acceptWindowStartTimestamp?: number;

}

// StoreProfile's canonical shape/data now lives in
// ../store-settings/data.ts (P6 owns it — it's a fuller store-settings
// object now: category, hours, avg prep time, phone, none of which
// belongs in an order-queue data file). Re-exported here since
// OrdersScreen/StoreProfileHeader already import it from './data' — this
// keeps that import path working without every caller needing to know the
// type moved. Live mutations (the Open/Closed toggle, settings edits) go
// through ../../store/useStoreProfileStore.ts, not this constant directly.
export type { StoreProfile } from '../store-settings/data';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'Just now';
  if (minutes <= 10) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
}

export function mapApiOrder(order: ApiOrder, allOrders: ApiOrder[]): PartnerOrder {
  // Retain local page position for compatibility with development fixtures.
  // This is not a repeat-customer signal and is not shown in the UI.
  const sameCustomerOrdered = allOrders
    .filter((o) => o.users?.phone === order.users?.phone)
    .sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());
  const orderCount = sameCustomerOrdered.findIndex((o) => o.id === order.id) + 1;

  return {
    id: order.id,
    orderNumber: order.order_number,
    isBulk: order.is_bulk === true,
    preorderWindow: order.deliver_from && order.deliver_until ? formatDeliveryWindow(order.deliver_from, order.deliver_until) : undefined,
    customerName: order.users?.name?.trim() || order.users?.phone || 'Customer',
    items: order.order_items.map((item) => ({
      name: item.product_name_at_order ?? item.products?.name ?? 'Item',
      quantity: item.quantity,
      // The cut and the flavour are part of what to prepare, so they ride on
      // the pack label every item row already shows ("1 kg · Medium pieces",
      // "72 g · Achaari Masti").
      unit: [item.unit_at_order ?? item.products?.unit ?? '', item.cut_size ? `${item.cut_size[0]!.toUpperCase()}${item.cut_size.slice(1)} pieces` : '', item.option_name_at_order ?? '', item.serving ? SERVING_LABEL[item.serving] : '']
        .filter(Boolean).join(' · '),
      price: item.unit_price_at_order * item.quantity,
      // A captured null image means the purchased item had no photo. Only
      // legacy rows without a name snapshot may fall back to today's image.
      imageUrl: item.product_name_at_order != null
        ? item.product_image_at_order ?? null
        : item.product_image_at_order ?? item.products?.image_url ?? null,
    })),
    total: order.total,
    itemTotal: order.item_total,
    commissionAmount: order.commission_amount,
    netPayout: round2(order.item_total - order.commission_amount),
    // 'cancelled' orders are filtered out before this ever runs
    // (useOrdersStore's own loadOrders) — this screen's queue has no use
    // for them. 'delivered' (today only) and 'failed' DO reach here — the
    // cast below is always one of the five real PartnerOrderStatus values.
    status: order.status as PartnerOrderStatus,
    placedAtLabel: formatRelativeTime(order.placed_at),
    placedAtTime: new Date(order.placed_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }),
    orderCount,
    // Authoritative: orders.payment_method is the real COD-vs-online signal
    // (set at order creation from the customer's chosen method), and
    // provider_payment_id tells whether an online payment has actually
    // settled. The old `provider_payment_id ? 'prepaid' : 'cod'` guess was
    // wrong for an online order still awaiting payment (null id) — it told
    // the owner to collect cash on an order that is not COD.
    paymentMode:
      order.payment_method === 'cod'
        ? 'cod'
        : order.provider_payment_id
          ? 'paid_online'
          : 'awaiting_payment',
    deliveryAddress: [order.addresses?.line1 ?? 'Address unavailable', order.addresses?.landmark ?? ''],
    customerPhone: order.users?.phone ?? '',
    placedAtTimestamp: new Date(order.placed_at).getTime(),
    acceptedAtTimestamp: order.accepted_at ? Date.parse(order.accepted_at) : undefined,
    acceptanceDeadlineTimestamp: order.acceptance_deadline_at ? Date.parse(order.acceptance_deadline_at) : undefined,
    preparationDeadlineTimestamp: order.preparation_deadline_at ? Date.parse(order.preparation_deadline_at) : undefined,
    acceptWindowStartTimestamp: order.store_visible_at ? new Date(order.store_visible_at).getTime() : undefined,
  };
}

// India time, whatever the phone's zone: "Sat 7 Nov, 7:00 – 9:00 AM".
export function formatDeliveryWindow(from: string, until: string): string {
  const ist = (iso: string) => new Date(Date.parse(iso) + 330 * 60_000);
  const time = (d: Date) => `${d.getUTCHours() % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  const start = ist(from); const end = ist(until);
  const day = `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][start.getUTCDay()]} ${start.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][start.getUTCMonth()]}`;
  return `${day}, ${time(start)} – ${time(end)} ${end.getUTCHours() < 12 ? 'AM' : 'PM'}`;
}
