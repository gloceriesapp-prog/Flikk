import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocationStore } from '../../../store/useLocationStore';
import { useHomeContent } from '../content/useHomeContent';
import { useNearbyStores } from '../nearby-stores/useNearbyStores';
import { warmInventoryPreviews, type PreviewTab } from './inventoryQuery';

// Home stays mounted beneath category routes. Warm data, not hidden screen
// trees: bounded memory, shared in-flight requests and one background read
// at a time. Address changes/backgrounding stop scheduling further reads.
export function useWarmHomeBrowse(enabled: boolean) {
  const client = useQueryClient();
  const location = useLocationStore((state) => state.location);
  const content = useHomeContent();
  const nearby = useNearbyStores();
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const storesKey = JSON.stringify(nearby.data.slice(0, 5).map((store) => store.id));
  const tabsKey = JSON.stringify(content.data?.filter((row) => row.content.enabled).map((row) => row.tabKey) ?? []);
  const hasContent = Boolean(content.data);
  useEffect(() => {
    if (!enabled || !foreground || !location || !hasContent) return;
    const storeIds: string[] = JSON.parse(storesKey);
    const tabs: PreviewTab[] = JSON.parse(tabsKey);
    let stopped = false;
    // Give the visible Home requests a head start, with jitter across devices.
    const timer = setTimeout(() => {
      void warmInventoryPreviews(client, storeIds, tabs, () => stopped);
    }, 800 + Math.random() * 400);
    return () => { stopped = true; clearTimeout(timer); };
  // The serialized scope changes only when stores, enabled tabs or address
  // change, rather than on every newly allocated mapped response array.
  }, [client, enabled, foreground, location, storesKey, tabsKey, hasContent]);
}
