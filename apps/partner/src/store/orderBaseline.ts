// Queue snapshots recover pending, unaccepted orders on launch and reconnect.
export interface BaselineRow {
  id: string;
  status: string;
  acceptedAtTimestamp?: number;
  acceptanceDeadlineTimestamp?: number;
}

// First load includes actionable pending orders; later reads alert only for new IDs.
export function computeNewlyArrivedIds(
  previous: readonly BaselineRow[],
  incoming: readonly BaselineRow[],
  baselineEstablished: boolean,
  now = Date.now(),
): string[] {
  const previousIds = new Set(previous.map((o) => o.id));
  return incoming.filter((o) => o.status === 'placed' && o.acceptedAtTimestamp == null
    && (o.acceptanceDeadlineTimestamp == null || o.acceptanceDeadlineTimestamp > now)
    && (!baselineEstablished || !previousIds.has(o.id))).map((o) => o.id);
}

// Just-delivered = an order that was present before with a real, DIFFERENT
// status and has now reached 'delivered' — a fresh transition, not a
// stale/late poll first catching an already-delivered order (that must not
// re-fire the "you earned" banner). Empty until baseline is established.
export function computeJustDeliveredIds(
  previous: readonly BaselineRow[],
  incoming: readonly BaselineRow[],
  baselineEstablished: boolean,
): string[] {
  if (!baselineEstablished) return [];
  const previousStatusById = new Map(previous.map((o) => [o.id, o.status]));
  return incoming
    .filter((o) => o.status === 'delivered' && previousStatusById.has(o.id) && previousStatusById.get(o.id) !== 'delivered')
    .map((o) => o.id);
}

// True when two order arrays have identical content (same length, same per-item
// JSON by position). The 3.5s/10s poll rebuilds a fresh `orders` array every
// cycle even when nothing actually changed; callers use this to keep the PREVIOUS
// array reference on an unchanged poll, so a React.memo'd OrderCard list doesn't
// re-render every tick. Positional (not set) comparison on purpose: a reorder is
// a real change worth a re-render. JSON per item compares id+status+every display
// field at once — stricter than listing fields by hand, and the queue is small.
// ponytail: JSON.stringify per item is O(n) over a tiny queue; a field-list
// signature only matters if the queue ever gets large, which it won't at MVP volume.
export function sameOrderList<T>(prev: readonly T[], next: readonly T[]): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (JSON.stringify(prev[i]) !== JSON.stringify(next[i])) return false;
  }
  return true;
}
