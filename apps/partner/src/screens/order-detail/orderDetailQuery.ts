import { queryOptions } from '@tanstack/react-query';
import type { PartnerOrder } from '../orders/data';

export function orderDetailQueryOptions({
  epoch, orderId, cached, read, enabled,
}: {
  epoch: number;
  orderId: string;
  cached: PartnerOrder | undefined;
  read: () => Promise<PartnerOrder>;
  enabled: boolean;
}) {
  return queryOptions({
    queryKey: ['partner-order-detail', epoch, orderId] as const,
    queryFn: read,
    enabled,
    // Seed once from the queue; subsequent queue removal must not erase a
    // detail that is still on screen. Never reuse another account/order.
    initialData: cached?.id === orderId ? cached : undefined,
    staleTime: 0,
    refetchInterval: false,
  });
}
