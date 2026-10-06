import { useEffect } from 'react';
import { useQuery, useQueryClient, type Query, type QueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { subscribeHomeContent, type InventoryEvent } from './realtime';

const homeInventory = new Set(['nearby-stores', 'nearest-store', 'deals-products', 'buy-it-again',
  'trending-this-week', 'everyday-essentials', 'groceries', 'festival-picks']);
export function isInventoryQuery(key: readonly unknown[]) {
  return (key[0] === 'home' && homeInventory.has(String(key[1]))) ||
    (key[0] === 'store-detail' && key[2] === 'products') || key[0] === 'store-list' ||
    (key[0] === 'search' && key[1] === 'products') ||
    (key[0] === 'product-detail' && key[1] === 'similar') ||
    (key[0] === 'category-detail' && (key[1] === 'products' || key[1] === 'subcategory-products'));
}
export function queryScope(key: readonly unknown[], data: unknown) {
  const stores = new Set<string>(); const zones = new Set<string>();
  const add = (set: Set<string>, id: unknown) => { if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) set.add(id); };
  if (key[0] === 'home' && key[2] === 'collection-pages' && Array.isArray(key[3])) key[3].forEach(id => add(stores, id));
  if (key[0] === 'store-detail') add(stores, key[1]);
  if (key[0] === 'product-detail' && key[1] === 'similar') add(stores, key[4]);
  if ((key[0] === 'store-list' && key[1] === 'popular-products') ||
      (key[0] === 'home' && key[1] === 'deals-products')) add(stores, key[2]);
  if (key[0] === 'home' && key[1] === 'groceries' && key[2] === 'store-inventory') add(stores, key[3]);
  const visit = (value: unknown, depth: number) => {
    if (depth > 6 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(item => visit(item, depth + 1)); return; }
    const row = value as Record<string, unknown>;
    add(stores, row.store_id); add(stores, row.storeId); add(zones, row.zone_id);
    // Store responses carry is_active/isOpen. Product IDs must never become
    // subscriptions just because a product has an id and a name.
    if ('is_active' in row || 'isOpen' in row) add(stores, row.id);
    if ((key[1] === 'nearest-store' || key[1] === 'featured-store') && depth === 0) add(stores, row.id);
    for (const field of ['pages', 'products', 'store', 'stores', 'items']) visit(row[field], depth + 1);
  };
  visit(data, 0);
  return { storeIds: [...stores].sort(), zoneIds: [...zones].sort() };
}
// A stock event must not replay every page previously visited by a customer.
// Keep the first page while refetching and let subsequent pages load on demand.
function trimPages(client: QueryClient, query: Query) {
  if (!(query.queryKey[0] === 'store-detail' || query.queryKey[2] === 'collection-pages')) return;
  const data = query.state.data as { pages?: unknown[]; pageParams?: unknown[] } | undefined;
  if (data?.pages && data.pageParams && data.pages.length > 1)
    client.setQueryData(query.queryKey, { ...data, pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) });
}
export function invalidateInventory(client: QueryClient, event: InventoryEvent) {
  const activeZones = client.getQueryData<{ zoneIds: string[] }>(['inventory-zone'])?.zoneIds ?? [];
  const activeStores = new Set(client.getQueryCache().getAll()
    .filter(q => q.isActive() && isInventoryQuery(q.queryKey))
    .flatMap(q => queryScope(q.queryKey, q.state.data).storeIds));
  const affected = client.getQueryCache().getAll().filter((query: Query) => {
    if (!isInventoryQuery(query.queryKey)) return false;
    // A disconnected/backgrounded app can miss changes in warmed tabs too.
    // Mark all catalogue caches stale, but invalidateQueries only refetches
    // active observers; unopened tabs refresh on demand without a DB burst.
    if (event.refresh) return true;
    const key = query.queryKey;
    const discovery = (key[0] === 'home' && (key[1] === 'nearby-stores' || key[1] === 'nearest-store')) ||
      (key[0] === 'store-list' && key[1] !== 'popular-products');
    if (discovery && !event.storeChanged) return false;
    const perStore = key[0] === 'store-detail' || (key[0] === 'product-detail' && key[4] != null) || (key[0] === 'store-list' && key[1] === 'popular-products') ||
      (key[0] === 'home' && (key[1] === 'deals-products' || (key[1] === 'groceries' && key[2] === 'store-inventory')));
    if (event.storeChanged && !perStore && event.zoneIds.some(id => activeZones.includes(id))) return true;
    const interests = queryScope(key, query.state.data);
    if (interests.storeIds.some(id => event.storeIds.includes(id))) return true;
    // A store opening/moving is discovery data; a stock update is not.
    if (event.storeChanged && interests.zoneIds.some(id => event.zoneIds.includes(id))) return true;
    // Empty cross-store shelves can gain a product from an interested store.
    return !discovery && !perStore && event.storeIds.some(id => activeStores.has(id));
  });
  affected.forEach(query => trimPages(client, query));
  const hashes = new Set(affected.map(query => query.queryHash));
  void client.invalidateQueries({ predicate: query => hashes.has(query.queryHash) });
}
export function useInventoryCacheSync() {
  const client = useQueryClient();
  useQuery({ queryKey: ['inventory-zone'], queryFn: () => apiRequest<{ zoneIds: string[] }>('/stores/inventory-scope', { auth: false }), staleTime: 300_000 });
  useEffect(() => {
    let stop: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let key = '';
    const update = () => {
      timer = undefined;
      const queries = client.getQueryCache().getAll().filter(q => q.isActive() && isInventoryQuery(q.queryKey));
      const scopes = queries.map(q => queryScope(q.queryKey, q.state.data));
      const interests = { storeIds: [...new Set(scopes.flatMap(s => s.storeIds))].sort(),
        zoneIds: [...new Set([...scopes.flatMap(s => s.zoneIds), ...(client.getQueryData<{ zoneIds: string[] }>(['inventory-zone'])?.zoneIds ?? [])])].sort() };
      const next = JSON.stringify(interests);
      if (next === key) return;
      key = next; stop?.();
      stop = subscribeHomeContent((kind, event) => { if (kind === 'inventory' && event) invalidateInventory(client, event); }, interests);
    };
    const unsubscribe = client.getQueryCache().subscribe(() => {
      if (!timer) timer = setTimeout(update, 300);
    });
    update();
    return () => { unsubscribe(); stop?.(); if (timer) clearTimeout(timer); };
  }, [client]);
}
