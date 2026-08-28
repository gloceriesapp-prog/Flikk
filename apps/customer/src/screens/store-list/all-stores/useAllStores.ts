// Real, active stores in the zone (GET /stores, backend/src/routes/
// stores.ts) — replaces the old STORE_LISTINGS mock (data.ts's fictional
// Shetty Stores/Krishna Mart/etc). Only fields that actually exist on the
// stores table are surfaced — no distance (no geolocation on stores yet,
// PRD v3 scope), no ratingCount/ownerNote (never real columns, invented for
// the mock). rating/avgPrepMinutes are nullable on the real row (a founder
// hasn't set them yet for most stores) — StoreCard.tsx shows them only when
// present rather than faking a number.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';

export interface RealStore {
  id: string;
  name: string;
  category: string;
  isOpen: boolean;
  photoUrl?: string;
  district?: string;
  rating?: number;
  avgPrepMinutes?: number;
}

interface ApiStore {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  photo_url: string | null;
  district: string | null;
  rating: number | null;
  avg_prep_minutes: number | null;
}

export function useAllStores() {
  return useQuery({
    queryKey: ['store-list', 'all-stores'],
    queryFn: async () => {
      const rows = await apiRequest<ApiStore[]>('/stores', { auth: false });
      return rows.map(
        (row): RealStore => ({
          id: row.id,
          name: row.name,
          category: row.category ?? 'Store',
          isOpen: row.is_active,
          photoUrl: row.photo_url ?? undefined,
          district: row.district ?? undefined,
          rating: row.rating ?? undefined,
          avgPrepMinutes: row.avg_prep_minutes ?? undefined,
        }),
      );
    },
  });
}
