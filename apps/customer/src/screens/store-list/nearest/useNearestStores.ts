// Real GET /stores/nearest (backend/src/routes/stores.ts), limit>1 this
// time — Home's own useNearestStore.ts (screens/home/) resolves just the
// single nearest one for order-scoping; this is the same endpoint asked
// for a real row of options instead, for NearestToYouSection's own
// horizontal card list. distance_km is computed server-side (real
// haversine against the store's own lat/lng, migration 005), not a dummy
// per-card hash the way StoreCard.tsx's own dummyDistanceLabel still is.
//
// Disabled with no delivery location — "nearest to me" has no real answer
// with no "me" to measure from, same reasoning every other
// location-dependent hook in this app already follows.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { useLocationStore } from '../../../store/useLocationStore';

const NEAREST_LIMIT = 8;

export interface NearestStore {
  id: string;
  name: string;
  category: string;
  rating?: number;
  photoUrl?: string;
  distanceKm: number;
  // Real is_active/close_time — same field, same "is this store currently
  // taking orders" convention StoreCard.tsx already established, not a
  // new concept invented for this card.
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

interface ApiNearestStore {
  id: string;
  name: string;
  category: string | null;
  rating: number | null;
  photo_url: string | null;
  distance_km: number;
  is_active: boolean;
  open_time: string | null;
  close_time: string | null;
}

export function useNearestStores() {
  const deliveryLocation = useLocationStore((s) => s.location);

  return useQuery({
    queryKey: ['store-list', 'nearest-stores', deliveryLocation?.latitude, deliveryLocation?.longitude],
    queryFn: async () => {
      const rows = await apiRequest<ApiNearestStore[]>(
        `/stores/nearest?lat=${deliveryLocation!.latitude}&lng=${deliveryLocation!.longitude}&limit=${NEAREST_LIMIT}`,
        { auth: false },
      );
      return rows.map(
        (row): NearestStore => ({
          id: row.id,
          name: row.name,
          category: row.category ?? 'Store',
          rating: row.rating ?? undefined,
          photoUrl: row.photo_url ?? undefined,
          distanceKm: row.distance_km,
          isOpen: row.is_active,
          openTime: row.open_time ?? undefined,
          closeTime: row.close_time ?? undefined,
        }),
      );
    },
    enabled: deliveryLocation !== null,
  });
}
