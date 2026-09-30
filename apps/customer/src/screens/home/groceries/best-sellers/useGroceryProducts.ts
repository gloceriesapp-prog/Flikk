import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../../api/products';
import { isGroceryProduct } from '../isGroceryProduct';

// The catalogue currently has no sales-ranking signal. Keep the data source
// separate so a ranked grocery feed can replace it without changing the UI.

export function useGroceryProducts() {
  return useQuery({
    queryKey: ['home', 'groceries', 'catalogue-picks'],
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>('/stores/products/catalog', { auth: false });
      return rows.filter(isGroceryProduct).slice(0, 6).map(mapApiProduct);
    },
  });
}
