import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../../apps/partner/src/api/client', () => ({ apiRequest: mock.request }));
import { useCatalogStore } from '../../../apps/partner/src/store/useCatalogStore';
import { resetSessionScope } from '../../../apps/partner/src/store/sessionScope';
const row = (id: string) => ({ id, name: id, category: 'Grocery', unit: '1 pc', price: 14.5, stock_status: 'in_stock', image_url: null, approval_status: 'approved', stock_quantity: 2, stock_tracking_enabled: true, product_variants: [] });
const page = (items = [row('a')], nextCursor: string | null = null) => ({ items, nextCursor });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }
beforeEach(() => { resetSessionScope(); mock.request.mockReset(); });
describe('bounded partner catalogue', () => {
 it('coalesces refreshes and respects freshness', async () => {
  const pending = deferred<ReturnType<typeof page>>(); mock.request.mockReturnValueOnce(pending.promise);
  const a = useCatalogStore.getState().loadProducts(); const b = useCatalogStore.getState().loadProducts(); expect(mock.request).toHaveBeenCalledTimes(1); expect(mock.request.mock.calls[0][0]).toContain('limit=30');
  pending.resolve(page()); await Promise.all([a,b]); await useCatalogStore.getState().loadProducts(); expect(mock.request).toHaveBeenCalledTimes(1);
 });
 it('loads bounded pages without duplicates and preserves stale data on failure', async () => {
  mock.request.mockResolvedValueOnce(page([row('a')], 'next')); await useCatalogStore.getState().loadProducts(); mock.request.mockResolvedValueOnce(page([row('a'),row('b')])); await useCatalogStore.getState().loadMore();
  expect(useCatalogStore.getState().products.map((p) => p.id)).toEqual(['a','b']); expect(mock.request.mock.calls[1][0]).toContain('cursor=next'); mock.request.mockRejectedValueOnce(new Error('offline')); await useCatalogStore.getState().loadProducts(true);
  expect(useCatalogStore.getState().products).toHaveLength(2); expect(useCatalogStore.getState().error).toContain('Could not refresh'); await useCatalogStore.getState().loadProducts(); expect(mock.request).toHaveBeenCalledTimes(3);
 });
 it('rejects old filter and account responses', async () => {
  const stale = deferred<ReturnType<typeof page>>(); mock.request.mockReturnValueOnce(stale.promise); const first = useCatalogStore.getState().loadProducts(); mock.request.mockResolvedValueOnce(page([row('fresh')])); await useCatalogStore.getState().setFilters('milk', 'all'); stale.resolve(page()); await first;
  expect(useCatalogStore.getState().products[0].id).toBe('fresh'); const account = deferred<ReturnType<typeof page>>(); mock.request.mockReturnValueOnce(account.promise); const loading = useCatalogStore.getState().loadProducts(true); resetSessionScope(); account.resolve(page()); await loading; expect(useCatalogStore.getState().products).toEqual([]);
 });
 it('does not let an old identical filter clear a newer in-flight read', async () => {
  const old = deferred<ReturnType<typeof page>>(); mock.request.mockReturnValueOnce(old.promise);
  const first = useCatalogStore.getState().loadProducts();
  mock.request.mockResolvedValueOnce(page([row('b')])); await useCatalogStore.getState().setFilters('b', 'all');
  const current = deferred<ReturnType<typeof page>>(); mock.request.mockReturnValueOnce(current.promise);
  const latest = useCatalogStore.getState().setFilters('', 'all'); old.resolve(page()); await first;
  const duplicate = useCatalogStore.getState().loadProducts(true); expect(mock.request).toHaveBeenCalledTimes(3);
  current.resolve(page([row('current')])); await Promise.all([latest, duplicate]); expect(useCatalogStore.getState().products[0].id).toBe('current');
 });
 it('sends image and category edits and fences late writes', async () => {
  mock.request.mockResolvedValueOnce(page()); await useCatalogStore.getState().loadProducts(); const update = deferred<ReturnType<typeof row>>(); mock.request.mockReturnValueOnce(update.promise);
  const saving = useCatalogStore.getState().updateProduct('a', 'Milk', [{ id: 'default', label: '1 pc', price: 14.5, stockQuantity: 2, isInStock: true }], { category: 'Dairy', imageUrl: 'https://images.gloceries.com/products/milk.webp' }); expect(mock.request.mock.calls[1][1].body).toMatchObject({ category: 'Dairy', imageUrl: expect.any(String) }); resetSessionScope(); update.resolve(row('a')); await expect(saving).rejects.toThrow('Account changed'); expect(useCatalogStore.getState().products).toEqual([]);
 });
});
