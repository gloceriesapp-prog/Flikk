import { QueryClient } from '@tanstack/react-query';
import { invalidateInventory, isInventoryQuery, queryScope } from '../src/screens/home/content/inventoryCache';
jest.mock('../src/api/client', () => ({ apiRequest: jest.fn() }));
jest.mock('../src/screens/home/content/realtime', () => ({ subscribeHomeContent: jest.fn() }));
const shop = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
it('recognises scoped catalogue, search and recommendation caches even when empty', () => {
  for (const key of [
    ['store-detail', shop, 'catalogue-products', {}], ['store-detail', shop, 'catalogue-categories'],
    ['store-detail', shop, 'catalogue-subcategories', 'category'], ['search', 'products-flavours-v2', 'milk', shop],
    ['product-detail', 'similar-v2', 'Drinks', 'source', shop, shop],
  ]) {
    expect(isInventoryQuery(key)).toBe(true);
    expect(queryScope(key, undefined).storeIds).toEqual([shop]);
  }
});
it('invalidates only the affected store and trims loaded product pages before recovery', () => {
  const client = new QueryClient();
  const products = ['store-detail', shop, 'catalogue-products', {}];
  const categories = ['store-detail', shop, 'catalogue-categories'];
  const foreign = ['store-detail', other, 'catalogue-products', {}];
  client.setQueryData(products, { pages: [{ products: [] }, { products: [] }], pageParams: ['', 'next'] });
  client.setQueryData(categories, []); client.setQueryData(foreign, { pages: [], pageParams: [] });
  invalidateInventory(client, { storeIds: [shop], zoneIds: [], storeChanged: false });
  expect(client.getQueryState(products)?.isInvalidated).toBe(true);
  expect(client.getQueryData(products)).toEqual({ pages: [{ products: [] }], pageParams: [''] });
  expect(client.getQueryState(categories)?.isInvalidated).toBe(true);
  expect(client.getQueryState(foreign)?.isInvalidated).toBe(false);
  client.clear();
});
