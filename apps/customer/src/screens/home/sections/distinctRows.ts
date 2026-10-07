// Home rows draw from overlapping feeds (7d vs 30d popularity; three deal
// rows over one discount-ranked list). Each product is shown in at most one
// row: rows claim in `priority` order, take unseen products up to their cap,
// and a row left with fewer than `min` products is hidden instead of
// repeating another row.

export function assignDistinctRows<K extends string, P extends { id: string }>(
  priority: K[], rows: Record<K, { feed: P[]; cap: number }>, min = 2,
): Record<K, P[]> {
  const used = new Set<string>();
  const out = {} as Record<K, P[]>;
  for (const key of priority) {
    const { feed, cap } = rows[key];
    const picked = feed.filter((p) => !used.has(p.id)).slice(0, cap);
    out[key] = picked.length >= min ? picked : [];
    out[key].forEach((p) => used.add(p.id));
  }
  return out;
}
