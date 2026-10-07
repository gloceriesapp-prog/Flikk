import type { ApiOrder, ApiOrderItem, OrderDeliveryAddress } from '../../api/orders';
import type { ApiTrip } from '../../api/trips';
import { mapOrderGroup, type PurchaseOrder } from '../purchase/data';
import { calculateOrderBill } from './utils/calculateOrderBill';

export interface SummaryItem extends ApiOrderItem {
  storeName: string;
}

export interface OrderSummary {
  arrival: PurchaseOrder;
  items: SummaryItem[];
  address: OrderDeliveryAddress | null;
  orderNumbers: string[];
  placedAt: string;
  paymentLabel: string;
  totalMrp: number | null;
  productDiscount: number | null;
  ourPrice: number;
  itemTotal: number;
  deliveryFee: number;
  handlingFee: number;
  discount: number;
  total: number;
}

// Historical charges come from the order/trip, never today's catalogue
// prices. Trip-level fees/discounts are counted once for the whole bill.
export function buildOrderSummary(order?: ApiOrder, trip?: ApiTrip): OrderSummary | null {
  const legs = trip ? trip.orders ?? [] : order ? [order] : [];
  if (!legs.length) return null;
  const first = legs[0];
  const payment = trip ?? first;
  const items = legs.flatMap((leg) => leg.order_items.map((item) => ({ ...item, storeName: leg.stores?.name ?? 'Store' })));
  return {
    arrival: mapOrderGroup(legs),
    items,
    address: (trip ? trip.addresses : first.addresses) ?? null,
    orderNumbers: legs.map((leg) => leg.order_number),
    placedAt: trip?.created_at ?? first.placed_at,
    paymentLabel: first.payment_method === 'cod' ? 'Cash on delivery'
      : payment.provider_payment_id ? 'Paid online' : 'Online payment pending',
    ...calculateOrderBill(items, payment),
  };
}
