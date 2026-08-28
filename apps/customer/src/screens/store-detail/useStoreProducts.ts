// One store's own real catalog (GET /stores/:id/products, backend/src/
// routes/stores.ts) — the "a product belongs only to the store it was
// added under, nothing else ever shows here" logic. Replaces data/
// registry.ts's old mock, which mixed FARM_PRODUCTS/BAKERY_PRODUCTS/
// ESSENTIALS_PRODUCTS (Home's own tab data) into a fake "Shetty Stores"
// catalog regardless of which real store a customer actually tapped, and
// fell every other store back to the same generic mix. Sidebar categories
// are derived from whatever categories this store's own products actually
// use — not a fixed list, so a store with only 2 categories doesn't grow a
// sidebar of empty tabs.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { mapApiProduct, type ApiProduct } from '../../api/products';
import type { Product } from '../home/products/types';

export interface StoreCategory {
  id: string;
  label: string;
}

export interface StoreCatalog {
  products: Product[];
  categories: StoreCategory[];
}

export function useStoreProducts(storeId: string) {
  return useQuery({
    queryKey: ['store-detail', storeId, 'products'],
    queryFn: async (): Promise<StoreCatalog> => {
      const rows = await apiRequest<ApiProduct[]>(`/stores/${storeId}/products`, { auth: false });
      const products = rows.map(mapApiProduct);

      const categoryLabels = Array.from(new Set(products.map((p) => p.categoryLabel).filter((c): c is string => !!c)));
      const categories: StoreCategory[] = [
        { id: 'all', label: 'All' },
        ...categoryLabels.map((label) => ({ id: label, label })),
      ];

      return { products, categories };
    },
    enabled: !!storeId,
  });
}
