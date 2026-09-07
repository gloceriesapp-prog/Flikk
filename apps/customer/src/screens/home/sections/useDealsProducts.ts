// "Today's Steal Deals" — real, currently-discounted products from the
// customer's own nearest store (GET /stores/:id/products?deals=true,
// backend/src/routes/stores.ts), not pooled across every store the way
// this used to hit /stores/products/deals. useNearestStore.ts resolves
// which store that is once per Home screen; this just asks for that one
// store's own deals. Disabled until a store has actually resolved — no
// storeId means there's nothing real to ask for yet, not "show every
// store's deals as a fallback" (that's exactly the pooling this replaces).
// Row->Product mapping lives in api/products.ts, shared with
// useEverydayEssentials.ts.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';

export function useDealsProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: ['home', 'deals-products', storeId],
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>(`/stores/${storeId}/products?deals=true`, { auth: false });
      return rows.map(mapApiProduct);
    },
    enabled: storeId !== undefined,
  });
}
