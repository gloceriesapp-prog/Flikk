// Real GET /partner/stats/today (backend/src/routes/partner.ts) —
// TodayStatsCard's own three numbers used to be derived client-side from
// whatever useOrdersStore's queue happened to hold (every currently-active
// order ever, no date scoping at all), which is why "Orders today" never
// actually meant "today." This is a real IST-calendar-day-scoped server
// computation instead — see that route's own note on exactly what each
// field counts and excludes.

import { apiRequest } from './client';

export interface TodayStats {
  ordersToday: number;
  pendingToday: number;
  earningToday: number;
}

export function fetchTodayStats(): Promise<TodayStats> {
  return apiRequest('/partner/stats/today');
}
