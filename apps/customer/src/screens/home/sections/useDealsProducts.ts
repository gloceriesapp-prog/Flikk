// Biggest real discounts near the delivery pin, ranked by discount % on the
// server (GET /browse/deals). The only deals feed on Home's All tab.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';
import { useLocationStore } from '../../../store/useLocationStore';

export function useDealsProducts() {
  const location = useLocationStore(s => s.location);
  return useQuery({
    queryKey: ['home', 'deals-products', location?.latitude, location?.longitude],
    queryFn: async () => (await apiRequest<ApiProduct[]>('/browse/deals', { auth: false })).map(mapApiProduct),
    enabled: !!location,
  });
}
