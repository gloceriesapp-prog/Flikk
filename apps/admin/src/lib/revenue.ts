// Pure aggregation over real Store/Order arrays — same shares-sum-to-100%
// logic mock-data.ts's own storeRevenueShares used, just no longer reading
// module-level placeholder constants (Zones page now fetches real stores
// and orders and passes them in).

import type { Order, Store } from './types';

export interface StoreRevenueShare {
  storeId: string;
  storeName: string;
  category: string;
  revenue: number;
  sharePct: number;
}

export function storeRevenueShares(zoneName: string, stores: Store[], orders: Order[]): StoreRevenueShare[] {
  const storesInZone = stores.filter((s) => s.zone === zoneName);
  const revenueByStore = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== 'delivered') continue;
    revenueByStore.set(order.storeId, (revenueByStore.get(order.storeId) ?? 0) + order.amount);
  }
  const zoneTotal = storesInZone.reduce((sum, s) => sum + (revenueByStore.get(s.id) ?? 0), 0);

  return storesInZone
    .map((s) => {
      const revenue = revenueByStore.get(s.id) ?? 0;
      return {
        storeId: s.id,
        storeName: s.name,
        category: s.category,
        revenue,
        sharePct: zoneTotal > 0 ? Math.round((revenue / zoneTotal) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
