// "Shops Near You" — real active stores in the zone (GET /stores,
// backend/src/routes/stores.ts), not the old STORE_LISTINGS mock. Same
// store rows a founder creates via admin's Add Store form
// (apps/admin/src/components/stores/AddStoreModal.tsx) — name and photo_url
// (uploaded to the "store-images" Storage bucket) come straight from there.
// Public read (stores_read_active RLS), no session needed.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';

export interface NearbyStore {
  id: string;
  name: string;
  photoUrl?: string;
}

interface ApiStore {
  id: string;
  name: string;
  photo_url: string | null;
}

export function useNearbyStores() {
  return useQuery({
    queryKey: ['home', 'nearby-stores'],
    queryFn: async () => {
      const rows = await apiRequest<ApiStore[]>('/stores', { auth: false });
      return rows.map((row): NearbyStore => ({ id: row.id, name: row.name, photoUrl: row.photo_url ?? undefined }));
    },
  });
}
