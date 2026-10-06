import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { TAB_KEYS, validateContent, type HomeContentRecord } from './contracts';
import { invalidateInventory } from './inventoryCache';
import { subscribeHomeContent } from './realtime';

// Several mounted tabs and the header observe the same query. Register one
// invalidation callback per QueryClient so events never cancel each other's
// refetches while a publication is being delivered.
const clients = new WeakMap<QueryClient, { count: number; stop: () => void }>();
function subscribeClient(client: QueryClient) {
  let entry = clients.get(client);
  if (!entry) {
    const stop = subscribeHomeContent((event) => {
      if (event === 'settings') return;
      if (event === 'content') {
        void client.invalidateQueries({ queryKey: ['home-content'] });
        void client.invalidateQueries({ queryKey: ['home-tabs'] });
        invalidateInventory(client, { storeIds: [], zoneIds: [], storeChanged: false, refresh: true });
      }
    });
    entry = { count: 0, stop };
    clients.set(client, entry);
  }
  entry.count += 1;
  return () => {
    entry.count -= 1;
    if (entry.count === 0) {
      entry.stop();
      clients.delete(client);
    }
  };
}

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
  useEffect(() => subscribeClient(client), [client]);
  return useQuery({
    queryKey: ['home-content'],
    queryFn: async () => {
      const rows = await apiRequest<HomeContentRecord[]>('/home/content', { auth: false });
      if (
        !Array.isArray(rows) ||
        rows.length !== TAB_KEYS.length ||
        new Set(rows.map((row) => row.tabKey)).size !== TAB_KEYS.length
      )
        throw new Error('Home content is not configured.');
      return rows.map((row) => {
        if (
          !TAB_KEYS.includes(row.tabKey) ||
          !Number.isSafeInteger(row.revision) ||
          row.revision < 1
        )
          throw new Error('Invalid Home content.');
        return { ...row, content: validateContent(row.content) };
      });
    },
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    enabled: active,
    // The shared realtime subscriber owns one foreground fallback timer.
    refetchInterval: false,
    refetchOnReconnect: 'always',
  });
}
