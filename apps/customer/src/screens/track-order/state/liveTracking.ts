import type { ApiOrder } from '../../../api/orders';
import type { ApiTrip } from '../../../api/trips';
import type { OrderLive, TripLive } from '../../../api/tracking';
export const terminal = (status: string) => ['delivered', 'cancelled', 'failed'].includes(status);
interface Progress {
  status?: string;
  refund_status?: string;
  orders?: Progress[];
  cancellation_refund?: { status: string } | null;
}
export function liveFinished(live: Progress) {
  if (live.cancellation_refund && ['queued', 'processing'].includes(live.cancellation_refund.status)) return false;
  const orders = 'orders' in live ? live.orders ?? [] : [live];
  return orders.length > 0 && orders.every(order => terminal(order.status ?? '') && order.refund_status !== 'processing');
}
export function orderCanAdvance(details: ApiOrder | undefined, live: OrderLive | undefined) {
  return !!details && !!live && details.id === live.id && (live.live_revision ?? 0) > (details.live_revision ?? 0);
}
export function tripCanAdvance(details: ApiTrip | undefined, live: TripLive | undefined) {
  return !!details && !!live && details.id === live.id && ((live.live_revision ?? 0) > (details.live_revision ?? 0) ||
    live.orders.some(leg => orderCanAdvance(details.orders?.find(order => order.id === leg.id), leg)));
}

export function liveIsOlder(details: { live_revision?: number }, live: { live_revision?: number }) {
  return (live.live_revision ?? 0) < (details.live_revision ?? 0);
}
export function mergeOrder(details: ApiOrder | undefined, live: OrderLive | undefined): ApiOrder | undefined {
  if (!details || !live || details.id !== live.id || liveIsOlder(details, live)) return details;
  // Clear an old rider immediately on reassignment; fetch details once for
  // the new rider rather than displaying the previous person's contact info.
  return { ...details, ...live, riders: details.rider_id === live.rider_id ? details.riders : null };
}
export function needsOrderDetails(details: ApiOrder | undefined, live: OrderLive | undefined) {
  return !!details && !!live && details.id === live.id && !liveIsOlder(details, live) && (details.rider_id ?? null) !== live.rider_id;
}
export function mergeTrip(details: ApiTrip | undefined, live: TripLive | undefined): ApiTrip | undefined {
  if (!details || !live || details.id !== live.id) return details;
  const parent = liveIsOlder(details, live) ? details : { ...details, ...live };
  return { ...parent, orders: details.orders?.map(order => mergeOrder(order, live.orders.find(leg => leg.id === order.id))!) };
}
export function needsTripDetails(details: ApiTrip | undefined, live: TripLive | undefined) {
  if (!details || !live || details.id !== live.id) return false;
  const legSetChanged = details.orders?.length !== live.orders.length || live.orders.some(leg => !details.orders?.some(order => order.id === leg.id));
  return (!liveIsOlder(details, live) && legSetChanged) ||
    live.orders.some(leg => needsOrderDetails(details.orders?.find(order => order.id === leg.id), leg));
}
export const trackingInterval = () => 8000 + Math.floor(Math.random() * 4000);

// A successful but lagging detail response must not immediately trigger
// another fetch. Retry on the next live poll (or explicit user retry).
export function detailRefreshKey(id: string, customerId: string | null, isTrip: boolean, liveUpdatedAt: number) {
  return `${customerId}:${isTrip ? 'trip' : 'order'}:${id}:${liveUpdatedAt}`;
}

export class DetailRefreshGate {
  private attempted: string | null = null;
  allow(key: string, needed: boolean, fetching: boolean) {
    if (!needed || fetching || this.attempted === key) return false;
    this.attempted = key;
    return true;
  }
}
