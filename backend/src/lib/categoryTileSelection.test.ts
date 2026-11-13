import { expect, it } from 'vitest';
import { createItem } from '../../../packages/home-content/index.js';
import { categoryTileSelection } from '../../../apps/admin/src/features/home-content/categoryTileSelection';

it('replaces inherited fruit/product filters when choosing Rice and Atta categories', () => {
  const old = { ...createItem('x').selection, mode: 'manual' as const, productIds: ['fruit'], storeIds: ['old-shop'], includeTerms: ['banana'], excludeTerms: ['flour'], discountedOnly: true };
  const rule = categoryTileSelection(old, { categories: ['rice', 'atta'] });
  expect(rule).toEqual({ mode: 'automatic', categoryIds: ['rice', 'atta'], productIds: [], storeIds: [], includeTerms: [], excludeTerms: [], discountedOnly: false });
  expect(old.productIds).toEqual(['fruit']);
});
it('hand-picked products do not inherit unrelated category or word filters', () => {
  const old = { ...createItem('x').selection, categoryIds: ['fruit'], includeTerms: ['mango'] };
  expect(categoryTileSelection(old, { products: ['rice-product'] })).toMatchObject({ mode: 'manual', productIds: ['rice-product'], categoryIds: [], includeTerms: [] });
});

it('preserves deliberate optional refinements when only reordering the same products', () => {
  const value = { ...createItem('x').selection, mode: 'manual' as const, productIds: ['a', 'b'], storeIds: ['shop'], discountedOnly: true };
  expect(categoryTileSelection(value, { products: ['b', 'a'] })).toEqual({ ...value, productIds: ['b', 'a'] });
});
