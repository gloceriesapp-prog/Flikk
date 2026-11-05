import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_EXTRA_IMAGES, sellingPrice, toExtraImageUrls, toVariantPayload, validateProductInput } from './productValidation';

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

const pack = { unitType: 'ml' as const, quantity: 180 };

test('sells at the store price and keeps a higher MRP for the strike-through', () => {
  const [row] = toVariantPayload([{ ...pack, price: 8, originalPrice: 10 }]);
  assert.equal(row!.price, 8);
  assert.equal(row!.original_price, 10);
});

test('sells at the MRP when no store price is entered, with no strike-through', () => {
  const [row] = toVariantPayload([{ ...pack, price: 0, originalPrice: 10 }]);
  assert.equal(row!.price, 10);
  assert.equal(row!.original_price, null);
  assert.equal(sellingPrice(0, 10), 10);
});

test('refuses a pack with neither a store price nor an MRP', () => {
  assert.throws(() => validateProductInput({ storeId: 's', name: 'Milk', category: 'Dairy', stockStatus: 'in_stock',
    variants: [{ ...pack, price: 0, originalPrice: null }] }), /store price or an MRP/);
});
