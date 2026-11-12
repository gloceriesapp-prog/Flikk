// Runnable self-check for the similar-products enable gate. No framework:
// `npx tsx src/components/ProductDetailSheet/useSimilarProducts.selfcheck.ts`
// from apps/customer. Imports the pure predicate from its own RN-free module so
// it runs without the react-query/expo graph. Asserts the predicate is false on
// mount (not opened) and true only once the detail is opened AND a real
// product ID exists — guarding the fix for the per-card network storm on Home.

import assert from 'node:assert';
import { similarProductsEnabled } from './similarProductsEnabled';

// On mount: a card has an ID but the detail is NOT open yet.
assert.equal(
  similarProductsEnabled(false, 'product-id'),
  false,
  'must NOT fetch on mount even with a product ID',
);

// After the trigger (detail opened), a product ID is enough, including brand browsing.
assert.equal(
  similarProductsEnabled(true, 'product-id'),
  true,
  'must fetch once opened and a product ID is present',
);

// No ID: never issue a malformed request.
assert.equal(similarProductsEnabled(true, undefined), false, 'no ID => never fetch');
assert.equal(similarProductsEnabled(false, undefined), false, 'no ID + not open => never fetch');
assert.equal(similarProductsEnabled(true, ''), false, 'empty product ID => never fetch');

console.log('useSimilarProducts selfcheck ok');
