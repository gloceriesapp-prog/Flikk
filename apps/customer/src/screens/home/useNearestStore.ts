// Resolves "my nearest store" ONCE for the whole Home screen — every
// store-scoped section (currently just "Today's Steal Deals",
// useDealsProducts.ts; more as real per-store inventory exists for the
// other sections, see AllTabSections.tsx's own note on which ones are
// still static mock content) reads the same resolved store id from here,
// so they can't ever disagree about which store an order on this screen
// would actually go to. Same GET /stores/nearest (backend/src/routes/
// stores.ts) the "Shops Near You" row already calls — limit=1 since this
// only needs the single nearest one, not a row of options.
//
// Disabled with no delivery location, same reasoning useNearbyStores.ts
// already documents: "nearest to me" has no real answer with no "me" to
// measure from.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';
import { useLocationStore } from '../../store/useLocationStore';

interface ApiNearestStore {
  id: string;
  name: string;
}

export function useNearestStore() {
  const deliveryLocation = useLocationStore((s) => s.location);

  const query = useQuery({
    queryKey: ['home', 'nearest-store', deliveryLocation?.latitude, deliveryLocation?.longitude],
    queryFn: async () => {
      const rows = await apiRequest<ApiNearestStore[]>(
        `/stores/nearest?lat=${deliveryLocation!.latitude}&lng=${deliveryLocation!.longitude}&limit=1`,
        { auth: false },
      );
      return rows[0] ?? null;
    },
    enabled: deliveryLocation !== null,
  });

  return { storeId: query.data?.id, storeName: query.data?.name, isLoading: query.isLoading };
}
