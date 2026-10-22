import { afterEach, beforeEach, expect, it, vi } from 'vitest';
beforeEach(() => { vi.resetModules(); vi.stubEnv('NEXT_PUBLIC_DEMO_DATA', 'true'); vi.stubEnv('NODE_ENV', 'development'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('loads sample data without a real token or a backend request', async () => {
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  const { apiRequest } = await import('../../../apps/partner-dashboard/src/lib/api');
  expect(await apiRequest('/partner/store')).toMatchObject({ id: 'demo-store', name: 'Coastal Fresh Mart' });
  expect(await apiRequest('/partner/orders?page=1')).toMatchObject({ nextCursor: null });
  expect(network).not.toHaveBeenCalled();
});
it('never falls through to the backend for writes or unsupported preview actions', async () => {
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  const { apiRequest } = await import('../../../apps/partner-dashboard/src/lib/api');
  await expect(apiRequest('/partner/store', { method: 'PATCH', body: { name: 'Changed' } })).rejects.toThrow('Preview only');
  await expect(apiRequest('/unsupported')).rejects.toThrow('unavailable');
  expect(network).not.toHaveBeenCalled();
});
it('is disabled in production even when the preview environment flag is true', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const { DEMO_DATA_ENABLED } = await import('../../../apps/partner-dashboard/src/lib/demoMode');
  const { demoRequest } = await import('../../../apps/partner-dashboard/src/lib/demoApi');
  expect(DEMO_DATA_ENABLED).toBe(false); expect(() => demoRequest('/partner/store', 'GET')).toThrow('disabled');
});
it('keeps inventory overview totals consistent with the filtered sample catalogue', async () => {
  const { demoRequest } = await import('../../../apps/partner-dashboard/src/lib/demoApi');
  const overview = demoRequest('/partner/products/overview', 'GET') as { total: number; outOfStock: number; runningLow: number; pending: number };
  const rows = (stock: string) => (demoRequest(`/partner/products?stock=${stock}`, 'GET') as { items: { stock_quantity: number; stock_tracking_enabled: boolean }[] }).items;
  expect(overview.total).toBe(rows('all').length);
  expect(overview.outOfStock).toBe(rows('out_of_stock').length);
  expect(overview.pending).toBe(rows('pending').length);
  expect(overview.runningLow).toBe(rows('low_stock').length);
  expect(rows('low_stock').every(p => p.stock_tracking_enabled && p.stock_quantity > 0 && p.stock_quantity < 5)).toBe(true);
});
it('deletes only sample products locally and refreshes inventory totals', async () => {
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  const { apiRequest } = await import('../../../apps/partner-dashboard/src/lib/api');
  await apiRequest('/partner/products/demo-product-1', { method: 'DELETE' });
  const catalogue = await apiRequest<{ items: { id: string }[] }>('/partner/products');
  const overview = await apiRequest<{ total: number }>('/partner/products/overview');
  expect(catalogue.items).toHaveLength(8);
  expect(catalogue.items.some(p => p.id === 'demo-product-1')).toBe(false);
  expect(overview.total).toBe(8);
  await expect(apiRequest('/partner/products/real-id', { method: 'DELETE' })).rejects.toThrow('Preview only');
  expect(network).not.toHaveBeenCalled();
});
