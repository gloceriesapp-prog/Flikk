// Runnable self-check for the similar-products enable gate. No framework:
// `npx tsx src/components/ProductDetailSheet/useSimilarProducts.selfcheck.ts`
// from apps/customer. Imports the pure predicate from its own RN-free module so
// it runs without the react-query/expo graph. Asserts the predicate is false on
// mount (not opened) and true only once the detail is opened AND a real
// category exists — guarding the fix for the per-card network storm on Home.

import assert from 'node:assert';
import { similarProductsEnabled } from './similarProductsEnabled';

// On mount: a card renders with its category but the detail is NOT open yet.
assert.equal(
  similarProductsEnabled(false, 'Snacks'),
  false,
  'must NOT fetch on mount even with a category (this is the storm being killed)',
);

// After the trigger (detail opened) with a real category: fetches.
assert.equal(
  similarProductsEnabled(true, 'Snacks'),
  true,
  'must fetch once opened and a category is present',
);

// No category: never fetches, open or not (mock products / missing label).
assert.equal(similarProductsEnabled(true, undefined), false, 'no category => never fetch');
assert.equal(similarProductsEnabled(false, undefined), false, 'no category + not open => never fetch');
assert.equal(similarProductsEnabled(true, ''), false, 'empty category string => never fetch');

console.log('useSimilarProducts selfcheck ok');
