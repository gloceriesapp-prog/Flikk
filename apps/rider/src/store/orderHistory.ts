// Pure merge of the server's delivery history into the local cache. The
// server wins for any order it knows (status, payout, timestamps); local-only
// rows survive (an order delivered moments ago that the server page doesn't
// include yet). Newest first by delivery time, then by id for a stable order.
// Free of Expo imports so orderHistory.selfcheck.ts runs under plain Node.

export interface HistoryOrder {
  id: string;
  deliveredAt?: string;
}

export function mergeHistory<T extends HistoryOrder>(local: readonly T[], server: readonly T[], max: number): T[] {
  const byId = new Map<string, T>();
  for (const order of local) byId.set(order.id, order);
  for (const order of server) byId.set(order.id, order);
  return [...byId.values()]
    .sort((a, b) => (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? '') || a.id.localeCompare(b.id))
    .slice(0, max);
}
