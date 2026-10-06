import { ApiError } from '../../api/client';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
function useCareSession() {
    const account = useAuthStore(s => s.customerId);
    const focused = useIsFocused();
    const [active, setActive] = useState(AppState.currentState === 'active');
    useEffect(() => { const sub = AppState.addEventListener('change', s => setActive(s === 'active')); return () => sub.remove(); }, []);
    // Subject is only a cache namespace. Backend ownership checks authorize data.
    return { account: account ?? 'guest', enabled: !!account && focused && active };
}
export function useCareList<T extends {
    id: string;
}>(key: string, load: (offset: number) => Promise<T[]>) {
    const { account, enabled } = useCareSession();
    const query = useInfiniteQuery({ queryKey: ['customer-care', account, key], enabled, initialPageParam: 0, queryFn: ({ pageParam }) => load(pageParam),
        getNextPageParam: (last, _pages, offset) => last.length === 25 && offset < 5000 ? offset + 25 : undefined, refetchInterval: enabled ? 15000 : false, refetchIntervalInBackground: false, retry: 1 });
    return { ...query, data: inaccessibleCare(query.error) ? undefined : query.data };
}
export function inaccessibleCare(error: unknown): boolean {
 return error instanceof ApiError && [401, 403, 404, 410].includes(error.status);
}
export function useCareDetail<T>(key: string, load: () => Promise<T>) {
    const { account, enabled } = useCareSession();
    const query = useQuery({ queryKey: ['customer-care', account, key], enabled, queryFn: load, refetchInterval: enabled ? 15000 : false, refetchIntervalInBackground: false, retry: 1 });
    return { ...query, data: inaccessibleCare(query.error) ? undefined : query.data };
}
export function uniqueRows<T extends {
    id: string;
}>(pages: T[][] | undefined): T[] {
    return [...new Map(pages?.flat().map(row => [row.id, row]) ?? []).values()];
}
