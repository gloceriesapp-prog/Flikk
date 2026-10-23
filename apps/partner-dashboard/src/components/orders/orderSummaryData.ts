import type { PartnerOrder } from '@/lib/partnerApi';
import { isStoreToday } from '../home/dashboardData';

function elapsed(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null;
  const ms = Date.parse(to) - Date.parse(from);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}
export function durationLabel(ms: number | null): string {
  if (ms === null) return '—';
  const seconds = Math.round(ms / 1000);
  const mins = Math.floor(seconds / 60);
  return seconds % 60 ? `${mins}m ${seconds % 60}s` : `${mins} min`;
}
export function orderSummaryData(orders: PartnerOrder[], now: number) {
  const today = orders.filter(order => isStoreToday(order.placed_at, now) && Date.parse(order.placed_at) <= now);
  const yesterdayNow = now - 86_400_000;
  const yesterday = orders.filter(order => isStoreToday(order.placed_at, yesterdayNow) && Date.parse(order.placed_at) <= yesterdayNow);
  const billed = today.filter(order => order.status !== 'cancelled');
  const sales = billed.reduce((sum, order) => sum + Math.round(order.item_total * 100), 0) / 100;
  const accepted = today.flatMap(order => {
    const ms = elapsed(order.store_visible_at || order.placed_at, order.accepted_at);
    return ms === null ? [] : [{ order, ms }];
  });
  const packing = today.flatMap(order => {
    const ms = elapsed(order.accepted_at, order.packed_at);
    return ms === null ? [] : [ms];
  });
  const cancelled = today.filter(order => order.status === 'cancelled');
  const outOfStock = cancelled.filter(order => order.cancel_reason === 'store_out_of_stock').length;
  const customerCancelled = cancelled.filter(order => order.cancel_reason === 'customer_cancelled' || order.cancel_reason === 'customer_cancel').length;
  const other = cancelled.length - outOfStock - customerCancelled;
  return {
    count: today.length,
    sales,
    averageValue: billed.length ? sales / billed.length : null,
    growth: yesterday.length ? (today.length - yesterday.length) / yesterday.length * 100 : null,
    acceptMs: accepted.length ? accepted.reduce((sum, entry) => sum + entry.ms, 0) / accepted.length : null,
    slowest: accepted.length ? accepted.reduce((slowest, entry) => entry.ms > slowest.ms ? entry : slowest) : null,
    packMs: packing.length ? packing.reduce((sum, ms) => sum + ms, 0) / packing.length : null,
    cancelled: cancelled.length,
    cancelRate: today.length ? cancelled.length / today.length * 100 : 0,
    cancelReasons: [outOfStock ? `${outOfStock} out of stock` : '', customerCancelled ? `${customerCancelled} customer cancelled` : '', other ? `${other} other / unspecified` : ''].filter(Boolean).join(' · '),
    awaiting: orders.filter(order => order.status === 'placed' && !order.accepted_at).length,
    ready: orders.filter(order => order.status === 'packed').length,
  };
}
