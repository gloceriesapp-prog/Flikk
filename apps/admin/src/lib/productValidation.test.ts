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
