// FeaturedStoreBanner's real data — first active store in the zone
// (GET /stores, backend/src/routes/stores.ts), same store rows a founder
// creates via admin's Add Store form. Not a "top store" ranking (no orders/
// rating data exists to rank by yet) — just today's featured pick.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';

export interface FeaturedStore {
  id: string;
  name: string;
  photoUrl?: string;
  openTime?: string;
  closeTime?: string;
}

interface ApiStore {
  id: string;
  name: string;
  photo_url: string | null;
  open_time: string | null;
  close_time: string | null;
}

export function useFeaturedStore() {
  return useQuery({
    queryKey: ['store-list', 'featured-store'],
    queryFn: async () => {
      const rows = await apiRequest<ApiStore[]>('/stores', { auth: false });
      const store = rows[0];
      if (!store) return null;
      const featured: FeaturedStore = {
        id: store.id,
        name: store.name,
        photoUrl: store.photo_url ?? undefined,
        openTime: store.open_time ?? undefined,
        closeTime: store.close_time ?? undefined,
      };
      return featured;
    },
  });
}
