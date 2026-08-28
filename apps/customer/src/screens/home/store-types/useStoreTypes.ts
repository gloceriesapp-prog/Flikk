// Distinct store categories present among real active stores (GET /stores,
// same endpoint nearby-stores/useNearbyStores.ts already uses) — grouped
// client-side, no new backend endpoint needed since /stores already
// returns every store's category. A category with zero live stores simply
// never appears, same "don't show an empty shelf" convention as every
// other Home section on this screen.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';

export interface StoreType {
  category: string;
  storeCount: number;
}

interface ApiStore {
  category: string | null;
}

export function useStoreTypes() {
  return useQuery({
    queryKey: ['home', 'store-types'],
    queryFn: async () => {
      const rows = await apiRequest<ApiStore[]>('/stores', { auth: false });
      const counts = new Map<string, number>();
      for (const row of rows) {
        if (!row.category) continue;
        counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
      }
      return Array.from(counts, ([category, storeCount]): StoreType => ({ category, storeCount })).sort(
        (a, b) => b.storeCount - a.storeCount,
      );
    },
  });
}
