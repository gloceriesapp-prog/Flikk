import { describe, expect, it } from 'vitest';
import { nextMorningSlot, statOf, summarizeAvailability, summarizeUser, type LiveProduct } from './availability.js';

const product = (patch: Partial<LiveProduct>): LiveProduct => ({ id: 'p', store_id: 's', category: 'Snacks', price: 20, original_price: null,
  image_url: 'https://img/p', bulk_min_kg: null, morning_slot: false, picked_at: null, party_enabled: false, brand_id: null, ...patch });
const ist = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);

describe('statOf (honest numbers)', () => {
  it('uses the real cheapest price, its MRP only when above price, and real discounts', () => {
    const s = statOf([product({ id: 'a', price: 30, original_price: 40 }), product({ id: 'b', price: 10, original_price: 8 }), product({ id: 'c', price: 50, original_price: 100 })]);
    expect(s).toMatchObject({ count: 3, minPrice: 10, minPriceMrp: null, maxDiscountPct: 50 });
  });
  it('has no discount when no MRP is real', () => {
    expect(statOf([product({ original_price: null })]).maxDiscountPct).toBeNull();
  });
  it('picks photos from the most popular items first', () => {
    const s = statOf([product({ id: 'a', image_url: 'A' }), product({ id: 'b', image_url: 'B' }), product({ id: 'c', image_url: 'C' })], ['c', 'a']);
    expect(s.imageUrls).toEqual(['C', 'A']);
  });
});

describe('nextMorningSlot (existing 2h pre-order cut-off)', () => {
  const slots = [{ id: '1', label: '6–7 AM', starts_minute: 360, ends_minute: 420 }, { id: '2', label: '7–9 AM', starts_minute: 420, ends_minute: 540 }];
  it('books tomorrow 6 AM until 4 AM', () => {
    expect(nextMorningSlot(slots, ist('2026-12-15', '22:00'))).toEqual({ open: true, cutoffMinute: 240 });
    expect(nextMorningSlot(slots, ist('2026-12-16', '03:59'))).toEqual({ open: true, cutoffMinute: 240 });
  });
  it('moves to the next slot after a cut-off, then to tomorrow', () => {
    expect(nextMorningSlot(slots, ist('2026-12-16', '04:30'))).toEqual({ open: true, cutoffMinute: 300 });
    expect(nextMorningSlot(slots, ist('2026-12-16', '08:00'))).toEqual({ open: true, cutoffMinute: 240 });
  });
  it('is closed with no slots', () => expect(nextMorningSlot([], ist('2026-12-16', '08:00')).open).toBe(false));
});

describe('summarizeAvailability', () => {
  const base = { stores: [], ranked: [], popularWeek: [], morningSlots: [], fishArrivals: [], brandIds: [] };
  it('counts only today’s fish arrival and village picks (IST dates)', () => {
    const now = ist('2026-12-15', '07:30');
    const a = summarizeAvailability({ ...base, now,
      products: [product({ id: 'f', category: 'Non Veg' }), product({ id: 'v', category: 'Fresh Vegetables', picked_at: '2026-12-15T00:30:00Z' }), product({ id: 'old', category: 'Fresh Vegetables', picked_at: '2026-12-14T10:00:00Z' })],
      fishArrivals: ['2026-12-15T01:10:00Z', '2026-12-14T01:00:00Z'] });
    expect(a.fish.arrivedMinute).toBe(6 * 60 + 40);
    expect(a.villagePickedToday.count).toBe(1);
    expect(a.vegetables.count).toBe(2);
  });
  it('offers the morning slot only when morning-slot items are in stock', () => {
    const slots = [{ id: '1', label: '6–7 AM', starts_minute: 360, ends_minute: 420 }];
    const now = ist('2026-12-15', '22:00');
    expect(summarizeAvailability({ ...base, now, morningSlots: slots, products: [product({})] }).preorder.open).toBe(false);
    expect(summarizeAvailability({ ...base, now, morningSlots: slots, products: [product({ morning_slot: true })] }).preorder.open).toBe(true);
  });
});

describe('summarizeUser', () => {
  const stock = [product({ id: 'milk', category: 'Milk', original_price: 30, price: 27 }), product({ id: 'bread', category: 'Bakery' }), product({ id: 'eggs', category: 'Milk' })];
  it('repeat items are bought in 2+ delivered orders and in stock now', () => {
    const user = summarizeUser([{ order_id: 'o1', product_id: 'milk', category: 'Milk' }, { order_id: 'o2', product_id: 'milk', category: 'Milk' }, { order_id: 'o1', product_id: 'bread', category: 'Bakery' }], 2, stock, []);
    expect(user.usuals.count).toBe(1);
    expect(user.offers).toMatchObject({ count: 1, maxDiscountPct: 10 });
  });
  it('a guest has no usuals or offers', () => {
    expect(summarizeUser(null, 0, stock, [])).toMatchObject({ kind: 'guest', usuals: { count: 0 }, offers: { count: 0 } });
  });
});
