// "Shops Near You" — GET /stores/nearest (backend/src/routes/stores.ts),
// ranked server-side by real distance from the customer's saved delivery
// location (useLocationStore — the address they confirmed on the map, not
// a live/moving GPS fix; ordering routes to a store based on where the
// order is going, not wherever the phone happens to be standing right
// now). The backend does the haversine math and the sorting — this hook
// only formats the distance it's handed back (formatDistance,
// geocoding.ts), it never receives every store's raw coordinates to sort
// itself. That's deliberate: swapping the ranking for something smarter
// later (a real delivery-radius cutoff, actual routing distance) is a
// backend-only change, no app update needed.
//
// isOpen/openTime carried straight through — the backend deliberately
// returns the true nearest store even when it's closed (that route's own
// note on the decision), so this row can show a real "Closed · opens at
// 9:00 AM" state instead of silently only ever showing open stores.
//
// Query is disabled until a delivery location exists — asking "what's
// nearest me" with no "me" to measure from doesn't have a real answer.

import { useQuery } from '@tanstack/react-query';
import { shopIsOpen } from '../../../utils/storeOpening';
import { useBrowseClock } from '../../../utils/useBrowseClock';
import { apiRequest } from '../../../api/client';
import { formatDistance } from '../../../location/geocoding';
import { useLocationStore } from '../../../store/useLocationStore';

export interface NearbyStore {
  id: string;
  name: string;
  photoUrl?: string;
  distanceLabel?: string;
  isOpen: boolean;
  openTime?: string;
  locality?: string;
}

interface ApiNearestStore {
  id: string;
  name: string;
  photo_url: string | null;
  distance_km: number;
  is_active: boolean;
  open_time: string | null;
  close_time?: string | null;
  address_line?: string | null;
  city?: string | null;
}

export function useNearbyStores() {
  const timestamp = useBrowseClock();
  const deliveryLocation = useLocationStore((s) => s.location);

  const query = useQuery({
    // Keyed on the actual coordinates, not just "do we have a location" —
    // moving the saved delivery pin to a different address should re-rank,
    // not keep serving a stale order from the old location.
    staleTime: 120_000,
    gcTime: 30 * 60_000,
    queryKey: ['home', 'nearby-stores', deliveryLocation?.latitude, deliveryLocation?.longitude],
    queryFn: () =>
      apiRequest<ApiNearestStore[]>(
        `/stores/nearest?lat=${deliveryLocation!.latitude}&lng=${deliveryLocation!.longitude}`,
        { auth: false },
      ),
    enabled: deliveryLocation !== null,
  });

  const stores: NearbyStore[] = (query.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url ?? undefined,
    distanceLabel: formatDistance(row.distance_km),
    isOpen: shopIsOpen({ isActive: row.is_active, openTime: row.open_time, closeTime: row.close_time }, new Date(timestamp)),
    openTime: row.open_time ?? undefined,
    locality: row.address_line?.trim() || row.city?.trim() || undefined,
  }));

  return { ...query, data: stores };
}
