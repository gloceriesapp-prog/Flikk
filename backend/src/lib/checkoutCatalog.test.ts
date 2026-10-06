import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), schemaCalls: 0, schemaError: null as unknown }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: mocks.from, rpc: async () => ({ data: 1, error: null }) } }));
const productId = '00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.resetModules();
  mocks.schemaCalls = 0;
  mocks.schemaError = null;
  mocks.from.mockClear();
  mocks.from.mockImplementation((table) => {
    const query = { select: () => query,
      limit: async () => { mocks.schemaCalls++; return { error: mocks.schemaError }; },
      in: async () => ({ error: null, data: [{ id: productId, store_id: 'shop', price: 10,
        unit: '1 pc', is_in_stock: true, product_variants: [] }] }) };
    if (!['products', 'order_items'].includes(table)) throw new Error('Unexpected table');
    return query;
  });
});
describe('checkout snapshot readiness', () => {
  it('blocks incomplete database deployments and recovers when the migration becomes available', async () => {
    const { loadCheckoutItems } = await import('./checkoutCatalog.js');
    mocks.schemaError = { code: '42703' };
    await expect(loadCheckoutItems([{ product_id: productId, quantity: 1 }])).rejects.toMatchObject({ status: 503 });
    expect(mocks.from).not.toHaveBeenCalledWith('products');
    mocks.schemaError = null;
    await expect(loadCheckoutItems([{ product_id: productId, quantity: 1 }])).resolves.toMatchObject([{ unit_price_at_order: 10 }]);
    await loadCheckoutItems([{ product_id: productId, quantity: 1 }]);
    expect(mocks.schemaCalls).toBe(2);
  });
  it('shares one successful schema check between concurrent checkouts', async () => {
    const { loadCheckoutItems } = await import('./checkoutCatalog.js');
    await Promise.all([loadCheckoutItems([{ product_id: productId, quantity: 1 }]), loadCheckoutItems([{ product_id: productId, quantity: 2 }])]);
    expect(mocks.schemaCalls).toBe(1);
  });
  it('validates input before accessing data and enforces the single-shop boundary', async () => {
    const { loadCheckoutItems } = await import('./checkoutCatalog.js');
    await expect(loadCheckoutItems([{ product_id: 'preview', quantity: 1 }])).rejects.toMatchObject({ status: 400 });
    expect(mocks.from).not.toHaveBeenCalled();
    await expect(loadCheckoutItems([{ product_id: productId, quantity: 1 }], 'other-shop')).rejects.toMatchObject({ code: 'MULTI_STORE_CART' });
  });
});

it('prices the supplied eligibility snapshot without reading products again', async () => {
  const { loadCheckoutItems } = await import('./checkoutCatalog.js');
  const catalog = [{ id: productId, store_id: 'shop', price: 12, unit: '1 pc', is_in_stock: true, product_variants: [] }];
  await expect(loadCheckoutItems([{ product_id: productId, quantity: 2 }], 'shop', catalog)).resolves.toMatchObject([{ unit_price_at_order: 12, quantity: 2 }]);
  expect(mocks.from).not.toHaveBeenCalledWith('products');
  expect(mocks.schemaCalls).toBe(1);
});
