// "Top Rated Stores Near You" (TopRatedStoresSection.tsx) — trust/social-
// proof row, sits right before DealsSection on Home's "All" tab.
//
// Reuses useAllStores (GET /stores, already fetches every active store in
// the zone) rather than a second store-list fetch — this just re-sorts
// that same real list by stores.rating (real column, only meaningful now
// that reviews.ts's own POST /reviews recomputes it) and takes the top 6.
// A store with no rating yet (no delivered order has been reviewed) is
// filtered out entirely rather than sorting to the bottom with a fake 0 —
// this row is specifically "proven good," not "every store, worst last."
//
// TEMPORARY ranking: plain rating desc, client-side. Swap for a real
// backend endpoint (e.g. GET /stores/top-rated) once this needs to factor
// in review COUNT too (a single 5-star review outranking a store with 50
// reviews at 4.8 is the obvious next problem with this simple version) —
// TopRatedStoresSection.tsx itself won't need to change when that happens.

import { useMemo } from 'react';
import { useAllStores } from '../../store-list/all-stores/useAllStores';

const TOP_RATED_LIMIT = 6;

export function useTopRatedStores() {
  const query = useAllStores();

  const stores = useMemo(
    () =>
      (query.data ?? [])
        .filter((store) => store.rating != null)
        .sort((a, b) => b.rating! - a.rating!)
        .slice(0, TOP_RATED_LIMIT),
    [query.data],
  );

  return { ...query, data: stores };
}
