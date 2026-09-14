// Pure ranking logic for Home's "Buy It Again" row (routes/orders.ts's own
// GET /orders/buy-it-again). Extracted so it's testable without a live
// Supabase connection, same reasoning as lib/orderValidation.ts/lib/
// trips.ts/lib/promos.ts — the route itself only ever does two real reads
// (this customer's delivered order_items, then the winning products) and
// hands the raw rows here.

export interface DeliveredOrderItem {
  product_id: string;
  placed_at: string;
}

// Ranked by repeat-purchase count first, most-recent order as the
// tiebreaker — a product bought 3 times outranks one bought once even if
// the single purchase was more recent, since "buy it again" is
// fundamentally about the customer's own established habit, not just
// recency (that's what a plain order-history list already shows).
export function rankRepeatPurchases(items: DeliveredOrderItem[], limit: number): string[] {
  const statsByProduct = new Map<string, { timesOrdered: number; lastPlacedAt: string }>();

  for (const item of items) {
    const existing = statsByProduct.get(item.product_id);
    if (existing) {
      existing.timesOrdered += 1;
      if (item.placed_at > existing.lastPlacedAt) existing.lastPlacedAt = item.placed_at;
    } else {
      statsByProduct.set(item.product_id, { timesOrdered: 1, lastPlacedAt: item.placed_at });
    }
  }

  return [...statsByProduct.entries()]
    .sort(([, a], [, b]) => b.timesOrdered - a.timesOrdered || b.lastPlacedAt.localeCompare(a.lastPlacedAt))
    .slice(0, limit)
    .map(([productId]) => productId);
}

// .in('id', ids) on the products table doesn't preserve the id list's own
// order — this puts the returned rows back into rank order rather than
// whatever order Postgres happened to return them in. A ranked id with no
// matching row (out of stock/unapproved/deactivated store since the
// purchase — routes/orders.ts's own query already filters for these, this
// just handles the id simply not coming back) is dropped, not left as a
// hole in the array.
export function reorderByRank<T extends { id: string }>(rankedIds: string[], rows: T[]): T[] {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return rankedIds.map((id) => rowById.get(id)).filter((row): row is T => row != null);
}
