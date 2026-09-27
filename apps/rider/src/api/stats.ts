// Real GET /rider/stats — the three trust-signal numbers on ProfileScreen
// (Deliveries / Completion / Rating), computed server-side from delivered
// orders and real customer reviews. Replaces utils/performance.ts's
// mock-derived computePerformanceStats. Thin client, no self-check.
//
// client is imported lazily (same as api/orders.ts) so this stays a pure
// fetch module — Metro caches the import, no per-call cost.

export interface RiderStats {
  deliveries: number; // lifetime delivered order count
  completionRate: number; // integer 0..100
  totalAttempted: number; // delivered + failed
  averageRating: number; // 2-decimal, defaults 5.00 for no reviews
  ratingCount: number; // real customer reviews on this rider's delivered orders
}

export async function fetchRiderStats(): Promise<RiderStats> {
  const { apiRequest } = await import('./client');
  return apiRequest('/rider/stats');
}
