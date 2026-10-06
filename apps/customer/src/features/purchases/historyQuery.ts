import { infiniteQueryOptions } from '@tanstack/react-query';
import { fetchOrderHistory } from '../../api/orders';

// Prewarming and the screen share an account-scoped key and request, so
// opening Purchase while a warmup runs does not create another database read.
export function purchaseHistoryOptions(customerId: string | null, params = new URLSearchParams()) {
  return infiniteQueryOptions({
    queryKey: ['my-orders', customerId, params.toString()],
    initialPageParam: '' as string,
    queryFn: ({ pageParam }) => fetchOrderHistory(params, pageParam || undefined),
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    enabled: !!customerId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
