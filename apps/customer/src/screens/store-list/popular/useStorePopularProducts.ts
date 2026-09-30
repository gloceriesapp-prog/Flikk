// "Popular this week" — real, currently-discounted products from one
// specific nearby store (GET /stores/:id/products?deals=true, same real
// endpoint Home's own useDealsProducts.ts already uses for the single
// nearest store). "This week" is editorial framing on the section title,
// not a real order-count/popularity ranking — no such signal exists
// anywhere in this schema (no order-line aggregation table). Scoping to
// a store's own real deals keeps every item honest: real product, real
// price, real discount, just not literally "most-ordered" the title
// implies. Called once per store shown in PopularThisWeekSection.tsx —
// react-query's own cache (keyed by storeId) means this is the same
// underlying data as Home's own deals row when the store overlaps.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';

const MAX_ITEMS = 4;

export function useStorePopularProducts(storeId: string) {
  return useQuery({
    queryKey: ['store-list', 'popular-products', storeId],
    queryFn: async () => {
      // Real products from this store (GET /stores/:id/products). Dropped the
      // ?deals=true filter — stores with no discounted product on file showed
      // an empty panel (whole card hidden). Now shows the store's real DB
      // products regardless of discount, first MAX_ITEMS.
      const rows = await apiRequest<ApiProduct[]>(`/stores/${storeId}/products`, { auth: false });
      return rows.map(mapApiProduct).slice(0, MAX_ITEMS);
    },
  });
}
