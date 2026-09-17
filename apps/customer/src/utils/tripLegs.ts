// Shared "one trip, N real per-store order rows" consolidation logic —
// used by both TrackOrderScreen (one combined detail card instead of one
// per leg) and PurchaseScreen/data.ts (one combined history card instead
// of one row per leg). Extracted here specifically so this exact
// bottleneck-leg reasoning only exists in one place — duplicating it was
// exactly the kind of drift CLAUDE.md warns about ("a bug fixed once in
// the shared pattern should be checkable across all three [call sites],
// not rediscovered independently in each").

import type { ApiOrder } from '../api/orders';

const STAGE_ORDER = ['placed', 'packed', 'out_for_delivery', 'delivered'];

function stageIndex(status: string): number {
  const index = STAGE_ORDER.indexOf(status);
  // A cancelled leg doesn't gate the rest of the trip's progress — treat
  // it as "as far along as it'll ever get" rather than letting one
  // cancelled store freeze the whole trip's displayed status at "Placed".
  return index === -1 ? STAGE_ORDER.length : index;
}

// The furthest-behind non-cancelled leg — the real bottleneck (a rider
// doing a multi-stop pickup can't be "out for delivery" for the trip as a
// whole until every store's leg is at least that far along). Falls back
// to legs[0] only if every leg in the trip was cancelled.
export function representativeLeg(legs: ApiOrder[]): ApiOrder {
  const activeLegs = legs.filter((leg) => leg.status !== 'cancelled');
  const pool = activeLegs.length > 0 ? activeLegs : legs;
  return pool.reduce((slowest, leg) => (stageIndex(leg.status) < stageIndex(slowest.status) ? leg : slowest));
}

export function joinStoreNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'Store';
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

// Groups a flat GET /orders list into one array per trip (or per solo
// order) — every real order sharing a non-null trip_id collapses into one
// group, preserving the original placed_at-descending order of whichever
// leg in each group appeared first in that list.
export function groupOrdersByTrip(orders: ApiOrder[]): ApiOrder[][] {
  const groups: ApiOrder[][] = [];
  const groupByTripId = new Map<string, ApiOrder[]>();

  for (const order of orders) {
    if (!order.trip_id) {
      groups.push([order]);
      continue;
    }
    const existing = groupByTripId.get(order.trip_id);
    if (existing) {
      existing.push(order);
    } else {
      const group: ApiOrder[] = [order];
      groupByTripId.set(order.trip_id, group);
      groups.push(group);
    }
  }

  return groups;
}
