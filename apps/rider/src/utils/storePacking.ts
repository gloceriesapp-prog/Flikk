// Riders are now offered an order as soon as the store accepts it, while it
// is still being packed (backend migration 20261026090000). The order can be
// taken early, but pickup waits until the store marks it packed. This turns
// the store's expected finish time (orders.preparation_deadline_at) into the
// short label the offer card and order screens show.
export function packingLabel(readyAt: number | null, now: number): string {
  if (readyAt == null) return 'Store is packing';
  const minutes = Math.ceil((readyAt - now) / 60_000);
  if (minutes <= 0) return 'Store is packing · almost ready';
  return `Store is packing · ready in ~${minutes} min`;
}

export function readyAtOf(preparationDeadlineAt: string | null | undefined): number | null {
  const at = preparationDeadlineAt ? Date.parse(preparationDeadlineAt) : NaN;
  return Number.isFinite(at) ? at : null;
}
