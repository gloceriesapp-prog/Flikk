import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import type { ApiProduct } from '../../../api/products';

export type PreviewTab = 'grocery' | 'fresh' | 'regional';

// Prefetch and visible shelves must use precisely the same key and policy.
// Never prefetch full catalogues: these endpoints return bounded previews.
export function inventoryPreviewQuery(storeId: string, tab?: PreviewTab) {
  return queryOptions({
    queryKey: ['home', 'groceries', 'store-inventory', storeId, tab ?? 'legacy-preview'],
    queryFn: ({ signal }) => apiRequest<ApiProduct[]>(
      tab ? `/stores/${storeId}/home-preview?tab=${tab}` : `/stores/${storeId}/products?limit=48`,
      { auth: false, signal },
    ),
    staleTime: 120_000,
    gcTime: 30 * 60_000,
  });
}

export async function warmInventoryPreviews(
  client: QueryClient,
  storeIds: string[],
  tabs: PreviewTab[],
  stopped: () => boolean,
) {
  for (const tab of [undefined, ...new Set(tabs)]) {
    for (const storeId of [...new Set(storeIds)].slice(0, 5)) {
      if (stopped()) return;
      const options = inventoryPreviewQuery(storeId, tab);
      const cached = client.getQueryState(options.queryKey);
      // Do not refresh every warmed scope on every foreground transition.
      // Stale previews refresh on demand; stock signals still invalidate them.
      if (cached?.data !== undefined && !cached.isInvalidated) continue;
      await client.prefetchQuery({ ...options, retry: false });
    }
  }
}
