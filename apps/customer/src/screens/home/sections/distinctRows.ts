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

// Same rows with the founder's hand-picked products (admin Home Sections,
// GET /browse/home-picks) placed first. Every row claims its own pins before
// any automatic product is handed out, so a pinned product is never repeated
// in another row. A row keeps its cap; pins take the first slots and the
// automatic feed fills what is left, unless the row is "pinned only". Pins
// that can't be bought right now are skipped so they never sit at the front.
// A row with at least one pin is always shown.
export function assignHomeRows<K extends string, P extends { id: string; isAvailable?: boolean }>(
  priority: K[], rows: Record<K, { feed: P[]; cap: number }>,
  pins: Partial<Record<K, P[]>>, pinnedOnly: ReadonlySet<string>, min = 2,
): Record<K, P[]> {
  const used = new Set<string>();
  const pinned = {} as Record<K, P[]>;
  for (const key of priority) {
    pinned[key] = (pins[key] ?? []).filter((p) => p.isAvailable !== false && !used.has(p.id)).slice(0, rows[key].cap);
    pinned[key].forEach((p) => used.add(p.id));
  }
  const out = {} as Record<K, P[]>;
  for (const key of priority) {
    const { feed, cap } = rows[key];
    const fill = pinnedOnly.has(key) ? [] : feed.filter((p) => !used.has(p.id)).slice(0, cap - pinned[key].length);
    const picked = [...pinned[key], ...fill];
    out[key] = pinned[key].length > 0 || picked.length >= min ? picked : [];
    fill.forEach((p) => { if (out[key].length) used.add(p.id); });
  }
  return out;
}
