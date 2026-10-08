import type { QueryClient } from '@tanstack/react-query';
import { subscribeHomeContent } from './realtime';
import { invalidateInventory } from './inventoryCache';
const PUBLIC_CONTENT_KEYS = new Set(['home-content', 'home-tabs', 'category-sections', 'category-detail']);
const HOME_SECTIONS = new Set(['sections', 'festival-greeting', 'festival-section', 'seasonal-section']);
export function invalidatePublicContent(client: QueryClient) {
  return client.invalidateQueries({ predicate: query => PUBLIC_CONTENT_KEYS.has(String(query.queryKey[0])) ||
    (query.queryKey[0] === 'home' && HOME_SECTIONS.has(String(query.queryKey[1]))) });
}
// Root and mounted Home shelves share one observer per account QueryClient.
// A client swap detaches the old subscription instead of retaining an old
// account's cache in a process-wide callback.
const clients = new WeakMap<QueryClient, { count: number; stop: () => void }>();
export function subscribePublicContentCache(client: QueryClient) {
  let entry = clients.get(client);
  if (!entry) {
    const stop = subscribeHomeContent((event, inventory) => {
      if (event === 'content') {
        void client.invalidateQueries({ queryKey: ['inventory-zone'] });
        void invalidatePublicContent(client);
        // Recovery also publishes an inventory refresh in the same batch;
        // its scoped observer handles that once, without cancelling refetches.
        if (!inventory?.refresh) invalidateInventory(client, { storeIds: [], zoneIds: [], storeChanged: false, refresh: true });
      } else if (event === 'config') {
        void client.invalidateQueries({ predicate: query => query.queryKey[0] === 'app-config' || query.queryKey[0] === 'app-release' });
      } else if (event === 'settings') {
        void client.invalidateQueries({ queryKey: ['delivery-settings'] });
        void client.invalidateQueries({ queryKey: ['checkout-quote'] });
      }
    });
    entry = { count: 0, stop };
    clients.set(client, entry);
  }
  entry.count++;
  let subscribed = true;
  return () => {
    if (!subscribed) return;
    subscribed = false;
    entry.count--;
    if (!entry.count) { entry.stop(); clients.delete(client); }
  };
}
