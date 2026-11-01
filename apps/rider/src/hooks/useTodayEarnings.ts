// Today's earnings + delivery count for both home screens, from the server's
// rider_earnings totals (GET /rider/earnings-summary) — the same source the
// Earnings tab uses. Summing the on-device order history instead drifted:
// it missed deliveries after a reinstall or phone switch, ignored admin
// earning corrections, and counted any on-device sample orders.
// A trip is one rider_earnings row, so `orders` counts it once.
import { useQuery } from '@tanstack/react-query';
import { fetchRiderEarningSummary } from '../api/earnings';
import { useRiderOrdersStore } from '../store/useRiderOrdersStore';

function todayWindow(): { from: string; until: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), until: end.toISOString() };
}

export function useTodayEarnings(): { total: number; deliveries: number } {
  const { from, until } = todayWindow();
  // A new local delivery changes this key, so the total refreshes right after
  // the rider completes a drop instead of waiting for the interval.
  const deliveredCount = useRiderOrdersStore((s) => s.completedOrders.length);
  const { data } = useQuery({
    queryKey: ['riderTodayEarnings', from, deliveredCount],
    queryFn: () => fetchRiderEarningSummary(from, until),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
  const days = data ?? [];
  return {
    total: days.reduce((sum, d) => sum + Number(d.total), 0),
    deliveries: days.reduce((sum, d) => sum + Number(d.orders), 0),
  };
}
