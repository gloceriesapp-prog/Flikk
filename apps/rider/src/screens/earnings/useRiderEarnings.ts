import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchRiderEarningPage, fetchRiderEarningSummary } from '../../api/earnings';

export function useRiderEarnings(from: string, until: string) {
  const query = useInfiniteQuery({
    queryKey: ['riderEarnings', from, until], initialPageParam: '',
    queryFn: ({ pageParam }) => fetchRiderEarningPage(from, until, pageParam || undefined),
    getNextPageParam: page => page.nextCursor ?? undefined, refetchOnWindowFocus: false,
  });
  const summary = useQuery({ queryKey: ['riderEarningsSummary', from, until], queryFn: () => fetchRiderEarningSummary(from, until) });
  return { ...query, data: query.data?.pages.flatMap(page => page.items) ?? [], summary,
    isPending: query.isPending || summary.isPending,
    isError: query.isError || summary.isError,
    refetch: async () => { await Promise.all([query.refetch(), summary.refetch()]); },
  };
}
