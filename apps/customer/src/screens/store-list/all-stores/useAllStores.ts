// Real, active stores in the zone (GET /stores, backend/src/routes/
// stores.ts) — replaces the old STORE_LISTINGS mock (data.ts's fictional
// Shetty Stores/Krishna Mart/etc). rating/avgPrepMinutes are nullable on the
// real row (a founder hasn't set them yet for most stores) — StoreCard.tsx
// shows them only when present rather than faking a number.
//
// latitude/longitude — a store's own fixed pin, captured once by the owner
// during onboarding (partner app's LocationPinScreen) and copied onto the
// real row at admin-approval time (migrations/005_stores_lat_lng.sql). Still
// optional/nullable: any store approved before that migration has no pin on
// file until backfilled by hand or re-onboarded. This is what
// useNearestStore.ts sorts by — not a live/moving coordinate, a one-time
// geocode of a fixed shopfront address.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';

export interface RealStore {
  id: string;
  name: string;
  category: string;
  isOpen: boolean;
  photoUrl?: string;
  // Real stores.address_line/city — same real columns
  // routes/stores.ts's own PRODUCT_WITH_VARIANTS_SELECT already joins for
  // ProductDetailSheet's seller card; GET /stores returns them too
  // (select('*')), this just wasn't reading them onto RealStore yet.
  addressLine?: string;
  city?: string;
  district?: string;
  rating?: number;
  avgPrepMinutes?: number;
  openTime?: string;
  closeTime?: string;
  latitude?: number;
  longitude?: number;
  // Real stores.created_at — TopRatedStoresSection/NewOnFlikkSection's own
  // client-side sort reads this (this hook already fetches every active
  // store in the zone; those two sections just re-sort/slice the same
  // list rather than adding a second store-list fetch each).
  createdAt: string;
}

interface ApiStore {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  photo_url: string | null;
  address_line: string | null;
  city: string | null;
  district: string | null;
  rating: number | null;
  avg_prep_minutes: number | null;
  open_time: string | null;
  close_time: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
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
          addressLine: row.address_line ?? undefined,
          city: row.city ?? undefined,
          district: row.district ?? undefined,
          rating: row.rating ?? undefined,
          avgPrepMinutes: row.avg_prep_minutes ?? undefined,
          openTime: row.open_time ?? undefined,
          closeTime: row.close_time ?? undefined,
          latitude: row.lat ?? undefined,
          longitude: row.lng ?? undefined,
          createdAt: row.created_at,
        }),
      );
    },
  });
}
