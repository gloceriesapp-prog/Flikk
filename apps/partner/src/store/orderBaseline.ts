// Pure baseline/diff logic lifted out of useOrdersStore.loadOrders so the
// "which orders genuinely just arrived / just delivered since the last poll"
// decision is testable without zustand or the network (orderBaseline.selfcheck.ts).
// This is the money path: a false negative here means a store owner never gets
// alerted to a real order (auto-reject), a false positive re-interrupts them for
// an order they already saw. See useOrdersStore's own header note on why the
// first poll of a session seeds silently (baselineEstablished).
export interface BaselineRow {
  id: string;
  status: string;
}

// Genuinely-new = a 'placed' order present now that was NOT in the previous
// poll. Empty until baseline is established (the first fetch seeds the queue
// without alerting). A dropped poll throws before this runs, so `previous`
// always reflects the last SUCCESSFUL poll — an order that persisted across an
// outage stays in `previous` and is therefore not re-alerted.
export function computeNewlyArrivedIds(
  previous: readonly BaselineRow[],
  incoming: readonly BaselineRow[],
  baselineEstablished: boolean,
): string[] {
  if (!baselineEstablished) return [];
  const previousIds = new Set(previous.map((o) => o.id));
  return incoming.filter((o) => o.status === 'placed' && !previousIds.has(o.id)).map((o) => o.id);
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
