import { describe, expect, it, vi } from 'vitest';
vi.mock('../../../apps/customer/src/screens/home/content/realtime', () => ({ subscribeHomeContent: vi.fn() }));
vi.mock('../../../apps/customer/src/api/client', () => ({ apiRequest: vi.fn() }));
import { QueryClient, QueryObserver } from '../../../apps/customer/node_modules/@tanstack/react-query';
import { invalidateInventory, queryScope } from '../../../apps/customer/src/screens/home/content/inventoryCache';
const a = '10000000-0000-0000-0000-000000000001';
const b = '10000000-0000-0000-0000-000000000002';
const zone = '10000000-0000-0000-0000-000000000003';
describe('Scoped customer inventory cache', () => {
  it('extracts real stores, not product or variant IDs', () => {
    expect(queryScope(['search', 'products'], [{ id: b, storeId: a, variants: [{ id: b }] }]).storeIds).toEqual([a]);
    expect(queryScope(['home', 'groceries', 'store-inventory', a], []).storeIds).toEqual([a]);
  });
  it('invalidates affected inventory without unrelated stores, discovery or private orders', () => {
    const client = new QueryClient();
    const first = ['store-detail', a, 'products']; const second = ['store-detail', b, 'products'];
    client.setQueryData(first, { products: [{ storeId: a }] });
    client.setQueryData(second, { products: [{ storeId: b }] });
    client.setQueryData(['home', 'nearby-stores'], [{ id: a, is_active: true, zone_id: zone }]);
    client.setQueryData(['my-orders', a], [{ storeId: a }]);
    invalidateInventory(client, { storeIds: [a], zoneIds: [zone], storeChanged: false });
    expect(client.getQueryState(first)?.isInvalidated).toBe(true);
    expect(client.getQueryState(second)?.isInvalidated).toBe(false);
    expect(client.getQueryState(['home', 'nearby-stores'])?.isInvalidated).toBe(false);
    expect(client.getQueryState(['my-orders', a])?.isInvalidated).toBe(false); client.clear();
  });
  it('discovers a new store even when the previous nearest result was empty', () => {
    const client = new QueryClient();
    client.setQueryData(['inventory-zone'], { zoneIds: [zone] });
    client.setQueryData(['home', 'nearby-stores'], []);
    invalidateInventory(client, { storeIds: [a], zoneIds: [zone], storeChanged: true });
    expect(client.getQueryState(['home', 'nearby-stores'])?.isInvalidated).toBe(true); client.clear();
  });
  it('recovery marks inactive inventory stale without fetching it or touching private caches', () => {
    const client = new QueryClient();
    const active = ['store-detail', a, 'products']; const inactive = ['store-detail', b, 'products'];
    client.setQueryData(active, []); client.setQueryData(inactive, []); client.setQueryData(['profile', a], {});
    const observer = new QueryObserver(client, { queryKey: active, queryFn: async () => [], staleTime: Infinity });
    const unsubscribe = observer.subscribe(() => {});
    invalidateInventory(client, { storeIds: [], zoneIds: [], storeChanged: true, refresh: true });
    expect(client.getQueryState(inactive)?.isInvalidated).toBe(true);
    expect(client.getQueryState(inactive)?.fetchStatus).toBe('idle');
    expect(client.getQueryState(['profile', a])?.isInvalidated).toBe(false);
    expect(client.getQueryState(active)?.fetchStatus).toBe('fetching'); unsubscribe(); client.clear();
  });
});

it('refreshes changed product photos in similar products while preserving other stores', () => {
  const client = new QueryClient();
  const key = ['product-detail', 'similar', 'Milk', 'product-a', a];
  const other = ['product-detail', 'similar', 'Milk', 'product-b', b];
  client.setQueryData(key, [{ storeId: a, imageUrl: 'https://images.example/old.webp' }]);
  client.setQueryData(other, [{ storeId: b }]);
  expect(queryScope(key, undefined).storeIds).toEqual([a]);
  invalidateInventory(client, { storeIds: [a], zoneIds: [], storeChanged: false });
  expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(client.getQueryState(other)?.isInvalidated).toBe(false);
  client.clear();
});

it('reads store interests from infinite pages, without subscribing to product IDs', () => {
  expect(queryScope(['store-detail', a, 'products'], {
    pages: [{ products: [{ id: b, store_id: a }] }], pageParams: [''],
  }).storeIds).toEqual([a]);
});

it('discards stale additional pages in inactive caches during recovery', () => {
  const client = new QueryClient();
  const key = ['home', 'groceries', 'collection-pages', [a], 'grocery'];
  client.setQueryData(key, { pages: [[{ storeId: a }], [{ storeId: a }]], pageParams: ['', 'next'] });
  invalidateInventory(client, { storeIds: [], zoneIds: [], storeChanged: true, refresh: true });
  expect(client.getQueryData(key)).toEqual({ pages: [[{ storeId: a }]], pageParams: [''] });
  expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(client.getQueryState(key)?.fetchStatus).toBe('idle');
  client.clear();
});

it('scopes paged collections to every contributing store and refreshes only the first page', () => {
  const client = new QueryClient();
  const key = ['home', 'groceries', 'collection-pages', [a, b], 'grocery', 'kitchen'];
  expect(queryScope(key, undefined).storeIds).toEqual([a, b]);
  client.setQueryData(key, { pages: [[{ storeId: a }], [{ storeId: b }]], pageParams: ['', 'cursor'] });
  invalidateInventory(client, { storeIds: [a], zoneIds: [], storeChanged: false });
  expect(client.getQueryData(key)).toEqual({ pages: [[{ storeId: a }]], pageParams: [''] });
  expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  client.clear();
});
