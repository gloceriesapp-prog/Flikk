// Every leg of a multi-shop trip carries the trip's one payout (the backend's
// rider_payout is per order or per whole trip, never per leg), so totals must
// count a trip once. Returns one order per delivery: the first leg of each trip.
interface Payable { tripId?: string; payout: number; tip?: number }

export function onePerDelivery<T extends Payable>(orders: T[]): T[] {
  const seen = new Set<string>();
  return orders.filter((order) => {
    if (!order.tripId) return true;
    if (seen.has(order.tripId)) return false;
    seen.add(order.tripId);
    return true;
  });
}

export function totalPayout(orders: Payable[]): number {
  return onePerDelivery(orders).reduce((sum, order) => sum + order.payout + (order.tip ?? 0), 0);
}
