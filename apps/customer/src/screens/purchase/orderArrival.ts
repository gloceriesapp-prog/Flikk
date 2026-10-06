import { estimateDeliveryTime } from '../../utils/estimateDelivery';
import type { PurchaseOrder } from './data';

export function getPurchaseDeliveredDateLabel(order: PurchaseOrder): string | null {
  if (order.status !== 'delivered' || !order.deliveredAtIso) return null;
  const deliveredAt = new Date(order.deliveredAtIso);
  if (!Number.isFinite(deliveredAt.getTime())) return null;
  return deliveredAt.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function getPurchaseArrivalDeadline(order: PurchaseOrder): number | null {
  if (order.status !== 'out_for_delivery' || !Number.isFinite(new Date(order.placedAtIso).getTime())) {
    return null;
  }
  const deadline = estimateDeliveryTime(order.placedAtIso, order.estimatedDeliveryMinutes, order.estimatedDeliveryAt).getTime();
  return Number.isFinite(deadline) ? deadline : null;
}

export function getPurchaseArrivalLabel(order: PurchaseOrder, now: number = Date.now()): string {
  if (order.status === 'cancelled') return 'Order cancelled';
  if (order.status === 'failed') return 'Delivery failed';
  if (order.status === 'delivered') {
    if (!order.deliveredAtIso) return 'Delivered';
    const deliveredAt = new Date(order.deliveredAtIso);
    if (!Number.isFinite(deliveredAt.getTime())) return 'Delivered';
    const time = deliveredAt.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase().replace(/\s+/g, ' ');
    return `Delivered at ${time}`;
  }

  if (order.status === 'placed' || order.status === 'packed') return 'Packing your order';

  const deadline = getPurchaseArrivalDeadline(order);
  if (deadline === null || !Number.isFinite(now)) return 'On the way';
  const minutes = Math.max(0, Math.ceil((deadline - now) / 60_000));
  return `Arriving in ${minutes} minute${minutes === 1 ? '' : 's'}`;
}
