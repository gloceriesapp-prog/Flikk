// Real rider profile stats — the server-side, DB-backed replacement for the
// mock client math in apps/rider/src/utils/performance.ts (which derived
// everything from data/mockOrders.ts because no backend existed to compute it).
// Pure: no DB imports — routes/rider.ts's GET /rider/stats does the querying and
// hands raw counts + a ratings array in here, so this logic has one testable
// place to live (riderStats.selfcheck.ts), same split as utils/performance.ts.
//
// Rating attribution: reviews (migration 020) rate the delivered ORDER/store
// experience, not the rider directly — there is no customer→rider rating flow.
// We attribute a delivered order's review to the rider who delivered it
// (orders.rider_id, which references users.id — 001_init.sql:62), the only real
// customer-satisfaction signal available for a rider today.
// ponytail: order-level review as a rider-rating proxy. Add a dedicated
// customer→rider rating flow later if rider-specific rating is needed; then
// this switches to that table and drops the orders-join attribution.
//
// New-rider convention (same as utils/performance.ts): a rider with no rated
// deliveries defaults to a perfect 5.00 rating and a 100% completion rate —
// nobody starts penalized before their first delivery.
const DEFAULT_RATING = 5;

export interface RiderStats {
  deliveries: number;
  completionRate: number;
  totalAttempted: number;
  averageRating: number;
  ratingCount: number;
}

export function computeRiderStats(input: { deliveredCount: number; failedCount: number; ratings: number[] }): RiderStats {
  const { deliveredCount, failedCount, ratings } = input;

  // 'cancelled' is deliberately NOT in failedCount (the caller only tallies
  // 'delivered' + 'failed') — a customer/store cancel isn't a rider failure.
  const totalAttempted = deliveredCount + failedCount;

  // Nothing attempted yet = nothing to have failed at → 100%, not 0%.
  const completionRate = totalAttempted === 0 ? 100 : Math.round((deliveredCount / totalAttempted) * 100);

  const averageRating = ratings.length ? Number((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(2)) : DEFAULT_RATING;

  return {
    deliveries: deliveredCount,
    completionRate,
    totalAttempted,
    averageRating,
    ratingCount: ratings.length,
  };
}
