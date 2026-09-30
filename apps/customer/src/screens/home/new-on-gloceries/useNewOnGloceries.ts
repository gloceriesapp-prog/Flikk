// "New on Gloceries" (NewOnGloceriesSection.tsx) — discovery-only row, sits near
// the end of Home's "All" tab, after Everyday Essentials.
//
// Reuses useAllStores (GET /stores, already fetches every active store in
// the zone) rather than a second store-list fetch — this just re-sorts
// that same real list by stores.created_at (real column) and takes the 6
// most recently onboarded. Gives a brand-new store owner real visibility
// on Home from the moment they're approved, without needing a manual
// admin "feature this store" step.

import { useMemo } from 'react';
import { useAllStores } from '../../store-list/all-stores/useAllStores';

const NEW_ON_GLOCERIES_LIMIT = 6;

export function useNewOnGloceries() {
  const query = useAllStores();

  const stores = useMemo(
    () =>
      [...(query.data ?? [])]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, NEW_ON_GLOCERIES_LIMIT),
    [query.data],
  );

  return { ...query, data: stores };
}
