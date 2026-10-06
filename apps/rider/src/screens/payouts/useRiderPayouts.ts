import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchRiderPayoutPage } from '../../api/payouts';

export function useRiderPayouts() {
  const query = useInfiniteQuery({ queryKey: ['riderPayouts'], initialPageParam: '', queryFn: ({ pageParam }) => fetchRiderPayoutPage(pageParam || undefined), getNextPageParam: page => page.nextCursor ?? undefined, refetchOnWindowFocus: false });
  return { ...query, data: query.data?.pages.flatMap(page => page.items) ?? [] };
}
