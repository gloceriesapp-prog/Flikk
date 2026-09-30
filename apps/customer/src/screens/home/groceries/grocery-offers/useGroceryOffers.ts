import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../../api/products';
import { isGroceryProduct } from '../isGroceryProduct';

export function useGroceryOffers() {
  return useQuery({
    queryKey: ['home', 'groceries', 'offers'],
    queryFn: async () => {
      const rows = await apiRequest<ApiProduct[]>('/stores/products/deals', { auth: false });
      return rows
        .filter((row) => isGroceryProduct(row) && row.original_price != null && row.original_price > row.price)
        .slice(0, 6)
        .map(mapApiProduct);
    },
  });
}
