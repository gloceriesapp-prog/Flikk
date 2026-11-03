import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_EXTRA_IMAGES, toExtraImageUrls } from './productValidation';

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
  const { toCutOptions, CUT_OPTIONS_CATEGORY } = await import('./productValidation');
  const meat = CUT_OPTIONS_CATEGORY;
  assert.equal(toCutOptions({ category: meat }), undefined);
  assert.deepEqual(toCutOptions({ category: meat, cutOptionsEnabled: true, bulkMinKg: 5 }), { cut_options_enabled: true, bulk_min_kg: 5 });
  assert.deepEqual(toCutOptions({ category: meat, cutOptionsEnabled: true, bulkMinKg: null }), { cut_options_enabled: true, bulk_min_kg: null });
  assert.deepEqual(toCutOptions({ category: meat, cutOptionsEnabled: false, bulkMinKg: 5 }), { cut_options_enabled: false, bulk_min_kg: null });
  assert.deepEqual(toCutOptions({ category: 'Vegetables', cutOptionsEnabled: true, bulkMinKg: 5 }), { cut_options_enabled: false, bulk_min_kg: null });
  assert.throws(() => toCutOptions({ category: meat, cutOptionsEnabled: true, bulkMinKg: 0 }));
  assert.throws(() => toCutOptions({ category: meat, cutOptionsEnabled: true, bulkMinKg: 501 }));
});
