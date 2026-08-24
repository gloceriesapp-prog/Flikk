// "You may also like" — SimilarProductsRow's real data source
// (GET /stores/products/similar, backend/src/routes/stores.ts), same
// category, excluding the product the sheet is already open on. Only real
// products carry a categoryLabel from the backend (api/products.ts); mock
// Product entries (data.ts files still used elsewhere) set their own
// relatedProducts field instead, so this hook is skipped for those — see
// ProductDetailSheet.tsx's own note on which one wins.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';

export function useSimilarProducts(category: string | undefined, excludeId: string) {
  return useQuery({
    queryKey: ['product-detail', 'similar', category, excludeId],
    enabled: Boolean(category),
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>(
        `/stores/products/similar?category=${encodeURIComponent(category!)}&exclude=${encodeURIComponent(excludeId)}`,
        { auth: false },
      );
      return rows.map(mapApiProduct);
    },
  });
}
