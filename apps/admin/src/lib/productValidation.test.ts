import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_EXTRA_IMAGES, toBrand, toExtraImageUrls, validateProductInput } from './productValidation';

const cover = 'https://cdn.example/a.webp';

test('gallery list is cleaned and kept in order', () => {
  assert.equal(toExtraImageUrls({ imageUrl: cover }), undefined);
  assert.deepEqual(toExtraImageUrls({ imageUrl: cover, extraImageUrls: [] }), []);
  assert.deepEqual(
    toExtraImageUrls({ imageUrl: cover, extraImageUrls: [' https://cdn.example/c.webp ', '', cover, 'https://cdn.example/b.webp', 'https://cdn.example/c.webp'] }),
    ['https://cdn.example/c.webp', 'https://cdn.example/b.webp'],
  );
});

test('gallery list rejects bad input', () => {
  assert.throws(() => toExtraImageUrls({ imageUrl: cover, extraImageUrls: ['javascript:alert(1)'] }));
  assert.throws(() => toExtraImageUrls({ imageUrl: null, extraImageUrls: ['https://cdn.example/b.webp'] }));
  const tooMany = Array.from({ length: MAX_EXTRA_IMAGES + 1 }, (_, i) => `https://cdn.example/${i}.webp`);
  assert.throws(() => toExtraImageUrls({ imageUrl: cover, extraImageUrls: tooMany }));
});

test('cut options are chicken-category only and carry a sane bulk threshold', async () => {
  const { toCutOptions } = await import('./productValidation');
  const meat = 'Chicken';
  assert.equal(toCutOptions({ category: meat }), undefined);
  assert.deepEqual(toCutOptions({ category: meat, cutOptionsEnabled: true, bulkMinKg: 5 }), { cut_options_enabled: true, bulk_min_kg: 5 });
  assert.deepEqual(toCutOptions({ category: meat, cutOptionsEnabled: true, bulkMinKg: null }), { cut_options_enabled: true, bulk_min_kg: null });
  assert.deepEqual(toCutOptions({ category: meat, cutOptionsEnabled: false, bulkMinKg: 5 }), { cut_options_enabled: false, bulk_min_kg: null });
  assert.deepEqual(toCutOptions({ category: 'Vegetables', cutOptionsEnabled: true, bulkMinKg: 5 }), { cut_options_enabled: false, bulk_min_kg: null });
  assert.throws(() => toCutOptions({ category: meat, cutOptionsEnabled: true, bulkMinKg: 0 }));
  assert.throws(() => toCutOptions({ category: meat, cutOptionsEnabled: true, bulkMinKg: 501 }));
});

// The Add/PATCH APIs use these same mappers for the product row and packs.
test('MRP-only product sends a positive default and pack price and preserves the MRP cap', async () => {
  const { toProductRow, toVariantPayload, customerUnitPrice, toVariantMarkups } = await import('./productValidation');
  const input = { storeId: 'store', name: 'Eno', category: 'Grocery', stockStatus: 'in_stock' as const,
    variants: [{ unitType: 'g' as const, quantity: 5, price: 0, originalPrice: 10, stockQuantity: 20, platformMarkup: 2 }] };
  validateProductInput(input);
  assert.equal(input.variants[0].price, 0, 'validation must not overwrite a form draft');
  const row = toProductRow(input);
  const [pack] = toVariantPayload(input.variants);
  assert.equal(row.price, 10);
  assert.equal(pack.price, 10);
  assert.equal(pack.original_price, 10);
  assert.equal(row.original_price, 10);
  assert.equal(pack.stock_quantity, 20);
  assert.equal(customerUnitPrice(pack.price, toVariantMarkups(input.variants)[0].platform_markup, pack.original_price), 10);
});

test('each additional pack resolves its own price and keeps edit identity and stock', async () => {
  const { toVariantPayload } = await import('./productValidation');
  assert.deepEqual(toVariantPayload([
    { id: 'existing', unitType: 'g', quantity: 5, price: 8, originalPrice: 10, stockQuantity: 3 },
    { unitType: 'g', quantity: 10, price: 0, originalPrice: 20 },
    { unitType: 'pc', quantity: 1, price: 5 },
  ]), [
    { id: 'existing', unit_type: 'g', quantity: 5, price: 8, original_price: 10, stock_quantity: 3 },
    { unit_type: 'g', quantity: 10, price: 20, original_price: 20 },
    { unit_type: 'pc', quantity: 1, price: 5, original_price: null },
  ]);
});

test('missing, negative, non-finite and sub-paise prices are rejected before database write', async () => {
  const input = { storeId: 'store', name: 'Eno', category: 'Grocery', stockStatus: 'in_stock' as const };
  for (const amounts of [
    { price: 0 }, { price: 0, originalPrice: 0 }, { price: -1, originalPrice: 10 },
    { price: NaN, originalPrice: 10 }, { price: 0, originalPrice: Infinity },
    { price: 0.001 }, { price: 0, originalPrice: 0.001 },
  ]) {
    assert.throws(() => validateProductInput({ ...input, variants: [{ unitType: 'g', quantity: 5, ...amounts }] }));
  }
  assert.throws(() => validateProductInput({ ...input, variants: [
    { unitType: 'g', quantity: 5, price: 10 }, { unitType: 'g', quantity: 10, price: 0 },
  ] }), /Size 2: enter a store price or MRP/);
});

test('brand: absent leaves it alone, empty or null clears it, only real ids are kept', () => {
  assert.equal(toBrand({}), undefined);
  assert.deepEqual(toBrand({ brandId: null }), { brand_id: null });
  assert.deepEqual(toBrand({ brandId: '' }), { brand_id: null });
  const id = '3f2b8a1c-5d4e-4f6a-9b7c-1d2e3f4a5b6c';
  assert.deepEqual(toBrand({ brandId: id }), { brand_id: id });
  assert.throws(() => toBrand({ brandId: 'amul' }), /brand/i);
});
