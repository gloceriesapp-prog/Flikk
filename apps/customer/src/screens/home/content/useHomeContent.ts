import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { TAB_KEYS, validateContent, type HomeContentRecord } from './contracts';
import { subscribePublicContentCache } from './publicContentCache';

export const HOME_SECTION_QUERY_KEYS = [
  ['home', 'sections'], ['home', 'festival-greeting'], ['home', 'festival-section'], ['home', 'seasonal-section'],
] as const;

export function useHomeContent() {
  const client = useQueryClient();
  const [active, setActive] = useState(
    AppState.currentState == null || AppState.currentState === 'active',
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => subscribePublicContentCache(client), [client]);
  return useQuery({
    queryKey: ['home-content'],
    queryFn: async () => {
      const rows = await apiRequest<HomeContentRecord[]>('/home/content', { auth: false });
      if (!Array.isArray(rows)) throw new Error('Home content is not configured.');
      // Tolerant by design: keep every valid row whose tabKey this app build
      // knows about, and skip the rest. A tab added on one side (DB vs the
      // bundled TAB_KEYS) or a single malformed doc must NOT blank the whole
      // home — unknown tabs are ignored, missing ones just don't render their
      // managed layout. (Previously this hard-threw on any count mismatch,
      // which is what made every tab + quick-categories vanish on drift.)
      const seen = new Set<string>();
      const result: HomeContentRecord[] = [];
      for (const row of rows) {
        if (!TAB_KEYS.includes(row.tabKey) || seen.has(row.tabKey)) continue;
        if (!Number.isSafeInteger(row.revision) || row.revision < 1) continue;
        try {
          result.push({ ...row, content: validateContent(row.content) });
          seen.add(row.tabKey);
        } catch {
          // Malformed tab content — drop just this tab, keep the rest.
        }
      }
      return result;
    },
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    enabled: active,
    // The shared realtime subscriber owns one foreground fallback timer.
    refetchInterval: false,
    refetchOnReconnect: 'always',
  });
}
