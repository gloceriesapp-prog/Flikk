// The one shared TanStack Query client config for the three Expo apps
// (customer/partner/rider). Lifted verbatim from the customer app's proven
// account-session cache (apps/customer/.../accountCache.ts) so a retry/stale
// bug fixed here reaches all three instead of only whichever app was last
// touched — same reasoning as this package's auth client.
//
// Framework-agnostic beyond @tanstack/react-query itself: no RN import, no
// NetInfo import (online wiring is injected — see ./onlineStatus). Apps still
// own their own client *instance* (each resets its cache on account switch);
// this only standardises how that instance is configured.

import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

// Network/timeout/5xx are worth retrying; 4xx (validation, auth, conflicts)
// are not — a 400/401/409 won't fix itself on a replay. Duck-typed on the
// numeric `status` the shared ApiError carries (auth/client.ts), so this stays
// import-free and also treats any non-ApiError throwable (status not a number)
// as a transient worth one more go.
export function isRetryableError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status !== 'number' || status === 0 || status >= 500;
}

// Queries are GETs: retry transient failures twice (failureCount is 0 on the
// first retry decision, so `< 2` = at most two retries). Mutations (POST/
// PATCH/DELETE) never auto-retry — a replayed order/payment call is worse than
// surfacing the error.
export function createAppQueryClient(overrides: QueryClientConfig = {}): QueryClient {
  const { defaultOptions, ...rest } = overrides;
  return new QueryClient({
    ...rest,
    defaultOptions: {
      ...defaultOptions,
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
        retry: (failureCount, error) => failureCount < 2 && isRetryableError(error),
        // Exponential backoff capped at 30s — react-query's own default shape,
        // pinned here so the proven config doesn't silently drift with the lib.
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
        refetchOnWindowFocus: false,
        ...defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...defaultOptions?.mutations,
      },
    },
  });
}
