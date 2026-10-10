// "You may also like" — SimilarProductsRow's real data source, and what
// feeds ProductDetailSheet's own peek-pager (it needs at least one result
// to show the swipeable "next/prev card" UI at all — see that file's own
// note). GET /stores/products/similar (backend/src/routes/stores.ts): same
// category first, falling back server-side to "anything else this same
// store sells" when no other real product shares the category — passing
// storeId is what enables that fallback. Only real products carry a
// categoryLabel/storeId from the backend (api/products.ts); mock Product
// entries (data.ts files still used elsewhere) set their own
// relatedProducts field instead, so this hook is skipped for those — see
// ProductDetailSheet.tsx's own note on which one wins.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';
import { similarProductsEnabled } from './similarProductsEnabled';

export { similarProductsEnabled } from './similarProductsEnabled';

export function useSimilarProducts(category: string | undefined, excludeId: string, storeId?: string, shouldFetch = true) {
  return useQuery({
    queryKey: ['product-detail', 'similar', category, excludeId, storeId],
    enabled: similarProductsEnabled(shouldFetch, category),
    queryFn: async () => {
      const params = new URLSearchParams({ category: category!, exclude: excludeId });
      if (storeId) params.set('storeId', storeId);
      const rows = await apiRequest<ApiProduct[]>(`/stores/products/similar?${params.toString()}`, { auth: false });
      return rows.map(mapApiProduct);
    },
  });
}
