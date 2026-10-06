import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { useLocationStore } from '../../../store/useLocationStore';
import { mapApiProduct, type ApiProduct } from '../../../api/products';
export function useTrendingThisWeek() {
  const location = useLocationStore(s => s.location);
  return useQuery({ queryKey: ['home', 'trending-this-week', location?.latitude, location?.longitude], enabled: !!location,
    queryFn: async () => (await apiRequest<ApiProduct[]>('/browse/popular', { auth: false })).map(mapApiProduct) });
}
