// "New on Gloceries" (NewOnGloceriesSection.tsx) — discovery-only row, sits near
// the end of Home's "All" tab, after Everyday Essentials.
//
// Reuses useAllStores (GET /stores, already fetches every active store in
// the zone) rather than a second store-list fetch — this just re-sorts
// that same real list by stores.created_at (real column) so the
// six most recently onboarded can be previewed on Home. Gives a brand-new store owner real visibility
// on Home from the moment they're approved, without needing a manual
// admin "feature this store" step.

import { useMemo } from 'react';
import { useAllStores } from '../../store-list/all-stores/useAllStores';

export function useNewOnGloceries() {
  const query = useAllStores();

  const stores = useMemo(
    () =>
      [...(query.data ?? [])]
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [query.data],
  );

  return { ...query, data: stores };
}
