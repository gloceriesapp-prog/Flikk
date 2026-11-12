import { storeProductsPath, storeCatalogueProducts } from '../src/screens/store-detail/useStoreProducts';
import type { StoreProductFilters } from '../src/screens/store-detail/useStoreProducts';
import type { ApiProduct } from '../src/api/products';
jest.mock('../src/api/client', () => ({ apiRequest: jest.fn() }));
const filters: StoreProductFilters = { category: 'all', veg: false, deals: false, price: 'all', sort: 'relevance' };
it('binds every product page and filter to the selected store', () => {
  const url = storeProductsPath('shop-1', { ...filters, category: 'cat-1', subcategory: 'sub-1', query: 'mango milk', deals: true }, 'cursor');
  expect(url).toContain('/stores/shop-1/catalogue-products?');
  const params = new URLSearchParams(url.split('?')[1]);
  expect(Object.fromEntries(params)).toMatchObject({ categoryId: 'cat-1', subcategoryId: 'sub-1', q: 'mango milk', after: 'cursor', deals: '1' });
  expect(storeProductsPath('shop-2', { ...filters, subcategory: 'stale-sub' }, '')).not.toContain('subcategoryId');
});
it('rejects cross-store rows and deduplicates paged products without losing scope', () => {
  const row = { id: 'p1', store_id: 'shop-1', name: 'Milk', product_variants: [] } as unknown as ApiProduct;
  const products = storeCatalogueProducts([{ products: [row, { ...row, id: 'foreign', store_id: 'shop-2' }], nextCursor: 'next' },
    { products: [row], nextCursor: null }], 'shop-1');
  expect(products).toHaveLength(1);
  expect(products[0]).toMatchObject({ id: 'p1', storeId: 'shop-1', browseStoreId: 'shop-1' });
});
