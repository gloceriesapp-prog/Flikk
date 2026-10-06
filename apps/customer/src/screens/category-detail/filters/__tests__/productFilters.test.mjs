import assert from 'node:assert/strict';
import test from 'node:test';
import { activeFilterCount, DEFAULT_FILTERS, filterProducts, getTypeOptions, isRealCategoryId } from '../productFilters.ts';

const products = [
  { id: 'a', price: 40, originalPrice: 50, categoryLabel: ' Vegetables ', isVeg: true },
  { id: 'b', price: 10, originalPrice: 10, categoryLabel: 'vegetables', isVeg: false },
  { id: 'c', price: 40, originalPrice: 80, categoryLabel: 'Fruit', isVeg: true },
  { id: 'd', price: Number.NaN, originalPrice: 20 },
];
const ids = (items) => items.map((item) => item.id);
const filtered = (overrides = {}, brands = []) => filterProducts(products, { ...DEFAULT_FILTERS, ...overrides }, brands);

test('default and equal-price sorting preserve catalogue order without mutating input', () => {
  assert.deepEqual(ids(filtered()), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids(filtered({ sort: 'price-low' })), ['b', 'a', 'c', 'd']);
  assert.deepEqual(ids(filtered({ sort: 'price-high' })), ['a', 'c', 'b', 'd']);
  assert.deepEqual(ids(products), ['a', 'b', 'c', 'd']);
});

test('nonfinite and negative prices sort last in either direction', () => {
  const invalid = [{ id: 'invalid', price: -1 }, { id: 'valid', price: 0 }];
  for (const sort of ['price-low', 'price-high']) {
    assert.deepEqual(ids(filterProducts(invalid, { ...DEFAULT_FILTERS, sort }, [])), ['valid', 'invalid']);
  }
});

test('type options merge casing and spaces and exclude missing metadata', () => {
  assert.deepEqual(getTypeOptions(products), [{ id: 'fruit', label: 'Fruit' }, { id: 'vegetables', label: 'Vegetables' }]);
  assert.deepEqual(ids(filtered({ type: 'vegetables' })), ['a', 'b']);
});

test('discount sorting uses percentages and deals exclude invalid or undiscounted prices', () => {
  assert.deepEqual(ids(filtered({ sort: 'discount', dealsOnly: true })), ['c', 'a']);
  const malformed = [{ id: 'negative', price: -1, originalPrice: 10 }, { id: 'infinite', price: 10, originalPrice: Infinity }];
  assert.deepEqual(filterProducts(malformed, { ...DEFAULT_FILTERS, dealsOnly: true }, []), []);
});

test('type, brand, vegetarian and offers filters combine rather than overwrite each other', () => {
  const brands = [{ id: 'brand-1', name: 'Checked brand', productIds: ['a', 'b'] }];
  assert.deepEqual(ids(filtered({ type: 'vegetables', brand: 'brand-1', vegOnly: true, dealsOnly: true }, brands)), ['a']);
});

test('missing brand or type metadata cannot produce false matches', () => {
  assert.deepEqual(filtered({ brand: 'removed-brand' }), []);
  assert.deepEqual(filtered({ type: 'removed-type' }), []);
  assert.deepEqual(ids(filtered({ vegOnly: true })), ['a', 'c']);
});

test('reset clears every filter and sort selection', () => {
  assert.equal(activeFilterCount(DEFAULT_FILTERS), 0);
  assert.equal(activeFilterCount({ sort: 'price-low', type: 'fruit', brand: 'brand', vegOnly: true, dealsOnly: true }), 5);
  assert.deepEqual(ids(filtered()), ['a', 'b', 'c', 'd']);
});

test('only database UUID categories use live category endpoints', () => {
  assert.equal(isRealCategoryId('00000000-0000-4000-8000-000000000001'), true);
  assert.equal(isRealCategoryId('fresh-vegetable'), false);
  assert.equal(isRealCategoryId('invalid'), false);
});
