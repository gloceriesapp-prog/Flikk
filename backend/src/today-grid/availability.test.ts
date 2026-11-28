import { describe, expect, it } from 'vitest';
import { localBrandsInStock, nextMorningSlot, statOf, summarizeAvailability, summarizeUser, type LiveProduct } from './availability.js';
import { festivalFrom } from './gridState.js';
import { nextIstMidnight } from '../../../packages/today-grid/index.js';

const product = (patch: Partial<LiveProduct>): LiveProduct => ({ id: 'p', store_id: 's', category: 'Snacks', sub_category_id: null, price: 20, original_price: null,
  image_url: 'https://img/p', bulk_min_kg: null, morning_slot: false, party_enabled: false, brand_id: null, ...patch });
const ist = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
const base = { stores: [], ranked: [], popularWeek: [], morningSlots: [], arrivals: [], picks: [], localBrands: [] };

describe('statOf (honest numbers)', () => {
  it('real cheapest price, MRP only when above price, real discounts', () => {
    expect(statOf([product({ id: 'a', price: 30, original_price: 40 }), product({ id: 'b', price: 10, original_price: 8 }), product({ id: 'c', price: 50, original_price: 100 })]))
      .toMatchObject({ count: 3, minPrice: 10, minPriceMrp: null, maxDiscountPct: 50 });
  });
});

describe('daily inputs expire at IST midnight', () => {
  it('computes expiry in IST, not server UTC', () => {
    // 23:30 IST on the 15th is still the 15th in UTC (18:00Z): expiry is IST midnight of the 16th.
    expect(nextIstMidnight(ist('2026-12-15', '23:30')).toISOString()).toBe('2026-12-15T18:30:00.000Z');
    // 00:30 IST on the 16th is the 15th in UTC: expiry is IST midnight of the 17th.
    expect(nextIstMidnight(ist('2026-12-16', '00:30')).toISOString()).toBe('2026-12-16T18:30:00.000Z');
  });
  it('today’s catch and village picks count only until they expire', () => {
    const products = [product({ id: 'fish', category: 'Non Veg' }), product({ id: 'veg', category: 'Fresh Vegetables' })];
    const arrivals = [{ store_id: 's', fish_arrived_at: ist('2026-12-15', '06:40').toISOString(), fish_product_ids: ['fish'], expires_at: nextIstMidnight(ist('2026-12-15', '06:40')).toISOString() }];
    const picks = [{ product_id: 'veg', expires_at: nextIstMidnight(ist('2026-12-15', '05:30')).toISOString() }];
    const morning = summarizeAvailability({ ...base, now: ist('2026-12-15', '07:30'), products, arrivals, picks });
    expect(morning.fish).toMatchObject({ count: 1, arrivedMinute: 400 });
    expect(morning.villagePickedToday.count).toBe(1);
    const nextDay = summarizeAvailability({ ...base, now: ist('2026-12-16', '00:01'), products, arrivals, picks });
    expect(nextDay.fish.count).toBe(0);
    expect(nextDay.villagePickedToday.count).toBe(0);
  });
  it('a shop arrival with no listed fish counts that shop’s Non Veg items', () => {
    const a = summarizeAvailability({ ...base, now: ist('2026-12-15', '07:00'), products: [product({ id: 'f1', category: 'Non Veg' }), product({ id: 'f2', category: 'Non Veg', store_id: 'other' })],
      arrivals: [{ store_id: 's', fish_arrived_at: ist('2026-12-15', '06:00').toISOString(), fish_product_ids: [], expires_at: ist('2026-12-16', '00:00').toISOString() }] });
    expect(a.fish.count).toBe(1);
  });
});

describe('local brands (Namma Brands)', () => {
  const brands = [{ id: 'b1', name: 'Bhat', logo_url: 'https://l/1', local_sort: 2 }, { id: 'b2', name: 'Acha', logo_url: 'https://l/2', local_sort: 1 }, { id: 'b3', name: 'Coastal', logo_url: null, local_sort: null }];
  it('counts only local brands with an in-stock product, in admin order', () => {
    const live = localBrandsInStock(brands, [product({ id: '1', brand_id: 'b1' }), product({ id: '2', brand_id: 'b2' })]);
    expect(live).toEqual({ count: 2, brandIds: ['b2', 'b1'], logoUrls: ['https://l/2', 'https://l/1'] });
    expect(localBrandsInStock(brands, [product({ id: '1', brand_id: 'b1' }), product({ id: '2', brand_id: 'b2' }), product({ id: '3', brand_id: 'b3' })]).count).toBe(3);
  });
});

describe('nextMorningSlot (existing 2h pre-order cut-off)', () => {
  const slots = [{ id: '1', label: '6–7 AM', starts_minute: 360, ends_minute: 420 }];
  it('books tomorrow 6 AM until 4 AM', () => expect(nextMorningSlot(slots, ist('2026-12-15', '22:00'))).toEqual({ open: true, cutoffMinute: 240 }));
});

describe('summarizeUser', () => {
  it('a guest has no usuals or offers', () => expect(summarizeUser(null, 0, [], [])).toMatchObject({ kind: 'guest', usualIds: [] }));
});

describe('festival comes from festival-greeting', () => {
  it('uses the tab title, else the greeting without "Happy"', () => {
    expect(festivalFrom({ is_active: true, tab_title: 'Deepavali', title: 'Happy Deepavali' })).toEqual({ active: true, name: 'Deepavali' });
    expect(festivalFrom({ is_active: true, tab_title: null, title: 'Happy Navratri' })).toEqual({ active: true, name: 'Navratri' });
    expect(festivalFrom({ is_active: false, tab_title: 'Onam' })).toEqual({ active: false, name: null });
    expect(festivalFrom(null)).toEqual({ active: false, name: null });
  });
});
