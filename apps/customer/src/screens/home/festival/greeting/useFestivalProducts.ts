// Festival rail products — random picks from the zone-wide catalog
// (GET /stores/products/catalog: approved, in-stock products across the one
// active zone, backend/src/routes/stores.ts). Deliberately NOT nearest-store
// scoped like useDealsProducts: the festival rail is a decorative accent, not
// an order-critical row, and gating it on a resolved nearest store meant it
// rendered empty (greeting with no cards) whenever no store resolved. This
// always has real data to show. Row->Product mapping shared via api/products.ts.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../../api/products';

export function useFestivalProducts(enabled = true) {
  return useQuery({
    queryKey: ['home', 'festival-picks'],
    enabled,
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>('/stores/products/catalog', { auth: false });
      // Random picks so the rail isn't just the first N rows like other rows.
      // ponytail: Fisher-Yates, in place, once per fetch (not per render).
      const products = rows.map(mapApiProduct);
      for (let i = products.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [products[i], products[j]] = [products[j], products[i]];
      }
      return products;
    },
  });
}
