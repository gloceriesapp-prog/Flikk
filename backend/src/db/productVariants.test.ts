import { beforeEach, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('./supabase.js', () => ({ supabase: { rpc } }));
import { saveCatalogueProduct } from './productVariants.js';
import { AppError } from '../lib/errors.js';
import { toVariantPayload } from '../lib/products.js';

beforeEach(() => vi.clearAllMocks());

it('saves the product row and its pack diff in one RPC call', async () => {
  rpc.mockResolvedValue({ data: 'product-1', error: null });
  const variants = toVariantPayload([{ id: 'pack-1', unitType: 'g', quantity: 250, price: 16 }]);
  expect(await saveCatalogueProduct({ productId: 'product-1', storeScope: 'store-1', fields: { name: 'Onion' }, variants })).toBe('product-1');
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith('save_catalogue_product', {
    p_product: 'product-1',
    p_store: 'store-1',
    p_fields: { name: 'Onion' },
    p_variants: [{ id: 'pack-1', unit_type: 'g', quantity: 250, price: 16, original_price: null }],
  });
});

it('maps a reserved-pack refusal to 409 and scope misses to 404', async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0409', message: 'The 250 g pack is reserved by an active order and cannot be removed' } });
  await expect(saveCatalogueProduct({ productId: 'p', storeScope: null, fields: {}, variants: [] })).rejects.toMatchObject({ status: 409, code: 'PACK_RESERVED' });
  rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0404', message: 'Product not found' } });
  await expect(saveCatalogueProduct({ productId: 'p', storeScope: 's', fields: {}, variants: null })).rejects.toMatchObject({ status: 404 });
  rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0400', message: 'Each pack size can only be listed once' } });
  await expect(saveCatalogueProduct({ productId: 'p', storeScope: 's', fields: {}, variants: null })).rejects.toBeInstanceOf(AppError);
});
