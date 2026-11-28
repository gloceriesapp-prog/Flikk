import { expect, it } from 'vitest';
import type { LiveProduct } from './availability.js';
import { cardDefinition } from './buildTodayGrid.js';
import { cardProductIds } from './cardProducts.js';
import { DEFAULT_CONFIG, parseConfig } from './config.js';
import { EMPTY_STAT, type UserSummary } from './types.js';

const p = (id: string, patch: Partial<LiveProduct> = {}): LiveProduct => ({ id, store_id: 's', category: 'Chips & Namkeen', price: 10, original_price: null,
  image_url: null, bulk_min_kg: null, morning_slot: false, picked_at: null, party_enabled: false, brand_id: null, ...patch });
const live = { products: [p('a'), p('b', { category: 'Ice Cream' }), p('c', { bulk_min_kg: 5 }), p('d', { brand_id: 'br1' }), p('e', { party_enabled: true })],
  ranked: ['b', 'c', 'a'], popularWeek: ['zz', 'a'], brandIds: ['br1'] };
const user: UserSummary = { kind: 'customer', deliveredOrders: 3, usuals: EMPTY_STAT, offers: EMPTY_STAT, usualIds: ['a', 'd'], offerIds: ['e'] };
const ids = (card: Parameters<typeof cardDefinition>[0], config = DEFAULT_CONFIG) => cardProductIds(cardDefinition(card, config), live, user);

it('lists exactly the in-stock products the card counted, most popular first', () => {
  expect(ids('ice-cream')).toEqual(['b']);
  expect(ids('snack-time')).toEqual(['c', 'a', 'd', 'e']);
  expect(ids('glo-bulk')).toEqual(['c']);
  expect(ids('party-orders')).toEqual(['e']);
  expect(ids('namma-brands')).toEqual(['d']);
  expect(ids('popular-near-you')).toEqual(['a']); // out-of-stock popular ids dropped
  expect(ids('your-usuals')).toEqual(['a', 'd']);
  expect(ids('offers-for-you')).toEqual(['e']);
});
it('follows the admin-edited category list', () => {
  expect(ids('snack-time', parseConfig({ cards: { 'snack-time': { categories: ['Ice Cream'] } } }))).toEqual(['b']);
});
