import { expect, it } from 'vitest';
import type { LiveProduct } from './availability.js';
import { cardProductIds } from './cardProducts.js';
import { DEFAULT_ITEMS, type ItemConfig } from '../../../packages/today-grid/index.js';
import { availability, GUEST } from './fixtures.js';

const p = (id: string, patch: Partial<LiveProduct> = {}): LiveProduct => ({ id, store_id: 's', category: 'Chips & Namkeen', sub_category_id: null, price: 10, original_price: null,
  image_url: null, bulk_min_kg: null, morning_slot: false, party_enabled: false, brand_id: null, ...patch });
const live = { products: [p('a'), p('b', { category: 'Ice Cream', sub_category_id: 'sub-1' }), p('c', { bulk_min_kg: 5 }), p('d', { brand_id: 'b1' }), p('e', { party_enabled: true })],
  ranked: ['b', 'c', 'a'], popularWeek: ['zz', 'a'], availability: availability({ localBrands: { count: 1, brandIds: ['b1'], logoUrls: [] } }) };
const user = { ...GUEST, kind: 'customer' as const, usualIds: ['a', 'd'], offerIds: ['e'] };
const ids = (item: ItemConfig) => cardProductIds(item, live, user);

it('opens the live in-stock products of the card’s target, most popular first', () => {
  expect(ids(DEFAULT_ITEMS['ice-cream'])).toEqual(['b']);
  expect(ids(DEFAULT_ITEMS['snack-time'])).toEqual(['c', 'a', 'd', 'e']);
  expect(ids(DEFAULT_ITEMS['glo-bulk'])).toEqual(['c']);
  expect(ids(DEFAULT_ITEMS['party-orders'])).toEqual(['e']);
  expect(ids(DEFAULT_ITEMS['namma-brands'])).toEqual(['d']);
  expect(ids(DEFAULT_ITEMS['popular-near-you'])).toEqual(['a']);
  expect(ids(DEFAULT_ITEMS['your-usuals'])).toEqual(['a', 'd']);
  expect(ids({ ...DEFAULT_ITEMS['tea-coffee'], target: { type: 'subcategory', id: 'sub-1' } })).toEqual(['b']);
  expect(ids({ ...DEFAULT_ITEMS['tea-coffee'], target: { type: 'products', productIds: ['e', 'gone', 'a'] } })).toEqual(['a', 'e']);
});
