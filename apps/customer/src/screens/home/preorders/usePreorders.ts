// Home Pre-orders section: pre-order products from shops that deliver to this
// pin, and the delivery slots to pick from (GET /browse/preorders).
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';
import { useLocationStore } from '../../../store/useLocationStore';
import type { PreorderSlot } from '../../../store/preorder';

interface ApiSlot { id: string; label: string; starts_minute: number; ends_minute: number }

export function usePreorders() {
  const location = useLocationStore(s => s.location);
  return useQuery({
    queryKey: ['home', 'preorders', location?.latitude, location?.longitude],
    queryFn: async () => {
      const data = await apiRequest<{ products: ApiProduct[]; slots: ApiSlot[] }>('/browse/preorders', { auth: false });
      return {
        products: data.products.map(mapApiProduct),
        slots: data.slots.map((s): PreorderSlot => ({ id: s.id, label: s.label, startsMinute: s.starts_minute, endsMinute: s.ends_minute })),
      };
    },
    enabled: !!location,
  });
}
