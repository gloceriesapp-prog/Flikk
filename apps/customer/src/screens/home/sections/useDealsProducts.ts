// "Today's Steal Deals" — real, currently-discounted products pulled from
// the backend's own catalog (GET /stores/products/deals, backend/src/routes
// /stores.ts), same products.product_variants rows a founder adds via
// admin's Inventory screen (apps/admin/src/components/inventory). Replaces
// the old static STEAL_DEALS_PRODUCTS mock — no dummy data left in this
// section. Public read (products_read_all/stores_read_active RLS), no
// session needed, so auth: false. Row->Product mapping lives in
// api/products.ts, shared with useEverydayEssentials.ts.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';

export function useDealsProducts() {
  return useQuery({
    queryKey: ['home', 'deals-products'],
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>('/stores/products/deals', { auth: false });
      return rows.map(mapApiProduct);
    },
  });
}
