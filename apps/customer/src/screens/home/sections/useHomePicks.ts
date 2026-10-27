// Founder's hand-picked products per Home section (admin Home Sections and
// Inventory "Show on home"), from stores that deliver to this pin, in order:
// GET /browse/home-picks -> { "trending": [...], "custom-xxxxxx": [...] }.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';
import { useLocationStore } from '../../../store/useLocationStore';
import type { Product } from '../products/types';

export function useHomePicks() {
  const location = useLocationStore(s => s.location);
  return useQuery({
    queryKey: ['home', 'picks', location?.latitude, location?.longitude],
    queryFn: async () => {
      const picks = await apiRequest<Record<string, ApiProduct[]>>('/browse/home-picks', { auth: false });
      return Object.fromEntries(Object.entries(picks).map(([key, rows]) => [key, rows.map(mapApiProduct)])) as Record<string, Product[]>;
    },
    enabled: !!location,
  });
}
