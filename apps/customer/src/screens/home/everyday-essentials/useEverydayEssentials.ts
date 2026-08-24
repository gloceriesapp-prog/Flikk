// "Today's Stock" row (EverydayEssentialsSection.tsx) — real catalog
// products from the backend (GET /stores/products/catalog), not the old
// static EVERYDAY_ESSENTIALS_PRODUCTS mock. That mock file still exists and
// is left alone here — cart/checkout's "You may also like"/"Recommended for
// you" rows still read from it (out of scope for this change). Row->Product
// mapping lives in api/products.ts, shared with useDealsProducts.ts.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';

export function useEverydayEssentials() {
  return useQuery({
    queryKey: ['home', 'everyday-essentials'],
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>('/stores/products/catalog', { auth: false });
      return rows.map(mapApiProduct);
    },
  });
}
