import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { useLocationStore } from '../../../store/useLocationStore';
import { mapApiProduct, type ApiProduct } from '../../../api/products';

// Units sold near the delivery pin (product_popularity_daily). Trending /
// Popular This Week = 7 days, Most Bought = 30 days — distinct feeds.
export function usePopularProducts(days: 7 | 30) {
  const location = useLocationStore(s => s.location);
  return useQuery({ queryKey: ['home', 'popular', days, location?.latitude, location?.longitude], enabled: !!location,
    queryFn: async () => (await apiRequest<ApiProduct[]>(`/browse/popular?days=${days}`, { auth: false })).map(mapApiProduct) });
}

export function useTrendingThisWeek() {
  return usePopularProducts(7);
}
