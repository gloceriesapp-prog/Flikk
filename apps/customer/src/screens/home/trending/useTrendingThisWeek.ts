// "Trending This Week" (TrendingSection.tsx) — momentum row, sits right
// after MostBoughtSection on Home's "All" tab.
//
// TEMPORARY data source: this reuses the same real catalog feed
// (GET /stores/products/catalog) MostBoughtSection/EverydayEssentialsSection
// already read, just reversed and capped at 6 — real product rows, not
// fabricated ones, but not a genuine "trending" signal either (no
// time-windowed order-volume aggregation exists yet). Swap queryFn below
// for a real GET /orders/trending-this-week (or similar — a zone-wide,
// last-N-days version of the same repeat-purchase ranking approach
// backend/src/lib/buyItAgain.ts already established for "Buy It Again")
// once that endpoint exists; TrendingSection.tsx itself needs no change
// when that swap happens, it only ever reads this hook's `data`.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';

const TRENDING_LIMIT = 6;

export function useTrendingThisWeek() {
  return useQuery({
    queryKey: ['home', 'trending-this-week'],
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>('/stores/products/catalog', { auth: false });
      return rows
        .slice(-TRENDING_LIMIT)
        .reverse()
        .map(mapApiProduct);
    },
  });
}
