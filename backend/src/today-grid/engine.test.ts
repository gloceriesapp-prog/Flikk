import { describe, expect, it } from 'vitest';
import { buildTodayGrid, DEFAULT_CONFIG, nextChangeAt, renderTag, type FestivalInput, type TodayGridConfig } from '../../../packages/today-grid/index.js';
import { availability, GUEST, ist, NEW_USER, NO_FESTIVAL, REGULAR, stat, TUESDAY } from './fixtures.js';
import type { Availability } from '../../../packages/today-grid/index.js';

const withConfig = (patch: (c: TodayGridConfig) => void): TodayGridConfig => { const c = structuredClone(DEFAULT_CONFIG); patch(c); return c; };
const build = (now: Date, opts: { user?: typeof REGULAR; a?: Availability; config?: TodayGridConfig; festival?: FestivalInput } = {}) =>
  buildTodayGrid({ now, user: opts.user ?? REGULAR, availability: opts.a ?? availability(), config: opts.config ?? DEFAULT_CONFIG, festival: opts.festival ?? NO_FESTIVAL });
const ids = (grid: { cards: { id: string }[] }) => grid.cards.map(c => c.id);
const status = (grid: { trace: { id: string; status: string }[] }, id: string) => grid.trace.find(row => row.id === id)?.status;

describe('slots and hero', () => {
  it.each([
    ['07:30', 'morning', 'todays-catch', ['milk-breakfast', 'your-usuals', 'breakfast-ready', 'tea-coffee']],
    ['10:00', 'late-morning', 'todays-catch', ['your-usuals', 'lunch-essentials', 'offers-for-you', 'taste-of-tulunadu']],
    ['14:00', 'afternoon', 'village-fresh', ['glo-bulk', 'offers-for-you', 'namma-brands', 'home-cleaning']],
    ['17:30', 'evening', 'veg-for-tomorrow', ['snack-time', 'cold-drinks', 'your-usuals', 'fish-meat']],
    ['20:30', 'night', 'veg-for-tomorrow', ['tomorrow-by-7', 'fish-meat', 'ice-cream', 'your-usuals']],
    ['23:00', 'late-night', 'fresh-by-7', ['tomorrow-by-7', 'late-night-snacks', 'daily-needs', 'your-usuals']],
  ])('%s IST -> %s', (time, slot, hero, cards) => {
    const grid = build(ist(TUESDAY, time));
    expect([grid.slot, grid.hero.id, ids(grid)]).toEqual([slot, hero, cards]);
  });
  it.each([['05:59', 'late-night'], ['06:00', 'morning'], ['11:59', 'late-morning'], ['12:00', 'afternoon'], ['15:59', 'afternoon'], ['16:00', 'evening'], ['21:59', 'night'], ['22:00', 'late-night']])(
    'IST boundary %s is %s', (time, slot) => expect(build(ist(TUESDAY, time)).slot).toBe(slot));
  it('uses India time even when the UTC date differs', () => {
    expect(build(new Date('2026-12-14T19:30:00Z')).slot).toBe('late-night'); // 01:00 IST on the 15th
    expect(ids(build(new Date('2026-12-31T19:00:00Z')))).toContain('glo-bulk'); // Jan 1 IST
  });
  it('falls back to Fruits & Vegetables when the slot hero has no data, and says why', () => {
    const grid = build(ist(TUESDAY, '07:30'), { a: availability({ fish: { ...stat(4), arrivedMinute: null } }) });
    expect(grid.hero.id).toBe('fruits-vegetables');
    expect(grid.trace.find(r => r.id === 'todays-catch')).toMatchObject({ status: 'no-data', reason: expect.stringContaining('arrival') });
  });
  it('a disabled hero falls back too', () => {
    expect(build(ist(TUESDAY, '13:00'), { config: withConfig(c => { c.items['village-fresh'].enabled = false; }) }).hero.id).toBe('fruits-vegetables');
  });
  it('hero carries up to 4 in-stock products to rotate, MRP only when real', () => {
    const top = [1, 2, 3, 4, 5].map(n => ({ id: `p${n}`, name: `Fish ${n}`, price: 100 + n, mrp: n === 2 ? 90 : 150, imageUrl: `https://img/p${n}` }));
    const hero = build(ist(TUESDAY, '07:30'), { a: availability({ fish: { ...stat(4, 180, 220), arrivedMinute: 400, top } }) }).hero;
    expect(hero.products?.map(p => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(hero.products?.[1]?.mrp).toBeNull(); // 90 is not above 102
    expect(hero.products?.[0]).toMatchObject({ name: 'Fish 1', price: 101, mrp: 150, imageUrl: 'https://img/p1' });
    expect(build(ist(TUESDAY, '07:30')).hero.products).toBeUndefined(); // no peeks, no rotation
  });
  it('hero tag and price are honest', () => {
    const hero = build(ist(TUESDAY, '07:30')).hero;
    expect(hero).toMatchObject({ tag: 'Landed 6:40 AM', tagText: '#FFD84D', price: { amount: 180, mrp: 220 } });
    const fake = build(ist(TUESDAY, '07:30'), { a: availability({ fish: { ...stat(4, 180, 150), arrivedMinute: 400 } }) }).hero;
    expect(fake.price).toEqual({ amount: 180, mrp: null });
  });
});

describe('modifiers (config order, later wins)', () => {
  it('month start uses its configured days, card and position', () => {
    expect(ids(build(ist('2026-12-03', '07:30')))[3]).toBe('glo-bulk');
    const off = withConfig(c => { c.modifiers.monthStart.on = false; });
    expect(ids(build(ist('2026-12-03', '07:30'), { config: off }))).not.toContain('glo-bulk');
    const days = withConfig(c => { c.modifiers.monthStart.toDay = 2; });
    expect(ids(build(ist('2026-12-03', '07:30'), { config: days }))).not.toContain('glo-bulk');
  });
  it('weekend party respects days and start time', () => {
    expect(ids(build(ist('2026-12-17', '17:30')))[3]).toBe('party-orders'); // Thursday
    expect(ids(build(ist('2026-12-17', '16:59')))).not.toContain('party-orders');
    expect(ids(build(ist('2026-12-20', '18:00')))).not.toContain('party-orders'); // Sunday
  });
  it('festival comes from festival-greeting input, titled from the template', () => {
    const festival = { active: true, name: 'Deepavali' };
    const grid = build(ist(TUESDAY, '10:00'), { festival });
    expect(grid.cards[2]).toMatchObject({ id: 'festival-needs', title: 'Deepavali Needs' });
    expect(ids(build(ist(TUESDAY, '10:00'), { festival, config: withConfig(c => { c.modifiers.festival.on = false; }) }))).not.toContain('festival-needs');
    expect(ids(build(ist(TUESDAY, '10:00'), { festival: { active: false, name: 'Deepavali' } }))).not.toContain('festival-needs');
  });
  it('rain: on after its start time, off after its auto-off instant', () => {
    const rain = withConfig(c => { c.modifiers.rain.on = true; c.modifiers.rain.until = ist(TUESDAY, '22:00').toISOString(); });
    expect(ids(build(ist(TUESDAY, '17:30'), { config: rain }))[2]).toBe('rainy-day');
    expect(ids(build(ist(TUESDAY, '15:59'), { config: rain }))).not.toContain('rainy-day');
    expect(ids(build(ist(TUESDAY, '22:30'), { config: rain }))).not.toContain('rainy-day');
  });
  it('combined: 3rd Thursday 18:00, raining, festival — rain wins position 3, party wins 4', () => {
    const rain = withConfig(c => { c.modifiers.rain.on = true; });
    expect(ids(build(ist('2026-12-03', '18:00'), { config: rain, festival: { active: true, name: 'Onam' } }))).toEqual(['snack-time', 'cold-drinks', 'rainy-day', 'party-orders']);
  });
  it('new-user threshold swaps Your Usuals for Popular Near You', () => {
    expect(ids(build(ist(TUESDAY, '07:30'), { user: NEW_USER }))).toContain('popular-near-you');
    const three = withConfig(c => { c.modifiers.newUsers.threshold = 8; });
    expect(ids(build(ist(TUESDAY, '07:30'), { config: three }))).not.toContain('your-usuals');
  });
  it('a guest never gets Usuals or Offers', () => {
    const cards = ids(build(ist(TUESDAY, '10:00'), { user: GUEST }));
    expect(cards).not.toContain('your-usuals');
    expect(cards).not.toContain('offers-for-you');
    expect(cards).toHaveLength(4);
  });
});

describe('data checks, backups and trace', () => {
  it('replaces a failing card with the first passing backup and records both', () => {
    const grid = build(ist(TUESDAY, '14:00'), { a: availability({ bulk: stat(0) }) });
    expect(ids(grid)).toEqual(['daily-essentials', 'offers-for-you', 'namma-brands', 'home-cleaning']);
    expect(status(grid, 'glo-bulk')).toBe('replaced');
    expect(status(grid, 'daily-essentials')).toBe('backup');
    expect(status(grid, 'ice-cream')).toBe('not-in-slot');
  });
  it('returns fewer than 4 when backups run out, never a duplicate', () => {
    const none = Object.fromEntries(Object.keys(availability().categories).map(n => [n, stat(0)]));
    const a = availability({ categories: { ...none, 'Home Cleaners': stat(4) }, bulk: stat(0) });
    const cards = ids(build(ist(TUESDAY, '14:00'), { a }));
    expect(cards).toEqual(['offers-for-you', 'namma-brands', 'home-cleaning']);
    expect(new Set(cards).size).toBe(cards.length);
  });
  it('a disabled card is skipped everywhere and the engine moves to the next backup', () => {
    const grid = build(ist(TUESDAY, '07:30'), { config: withConfig(c => { c.items['tea-coffee'].enabled = false; }) });
    expect(ids(grid)).toEqual(['milk-breakfast', 'your-usuals', 'breakfast-ready', 'daily-essentials']);
    expect(status(grid, 'tea-coffee')).toBe('replaced');
  });
  it('Namma Brands needs 3+ local brands in stock and shows their logos', () => {
    const two = availability({ localBrands: { count: 2, brandIds: ['b1', 'b2'], logoUrls: ['https://logo/1'] } });
    expect(ids(build(ist(TUESDAY, '14:00'), { a: two }))).not.toContain('namma-brands');
    const card = build(ist(TUESDAY, '14:00')).cards.find(c => c.id === 'namma-brands');
    expect(card).toMatchObject({ tag: 'Local makers', line: 'Made in Udupi', imageUrls: ['https://logo/1'], target: { type: 'brands' } });
  });
  it('picked images show only products in stock now, else automatic images', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const picked = withConfig(c => { c.items['tea-coffee'].images = { mode: 'picked', productIds: [id] }; });
    const card = build(ist(TUESDAY, '07:30'), { config: picked, a: availability({ products: { [id]: { id, name: 'Chai', price: 40, mrp: null, imageUrl: 'https://img/picked' } } }) }).cards.find(c => c.id === 'tea-coffee');
    expect(card?.imageUrls).toEqual(['https://img/picked']);
    const gone = build(ist(TUESDAY, '07:30'), { config: picked }).cards.find(c => c.id === 'tea-coffee');
    expect(gone?.imageUrls).toEqual(['https://img/a']); // one image per card
  });
  it('a custom photo replaces the product photo; price, MRP and name stay the product\'s', () => {
    const [a1, a2] = ['00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2'];
    const products = {
      [a1]: { id: a1, name: 'Seer Fish', price: 599, mrp: 1295, imageUrl: 'https://img/seer' },
      [a2]: { id: a2, name: 'Prawns', price: 320, mrp: 300, imageUrl: '' }, // no photo of its own
    };
    const config = withConfig(c => { c.items['todays-catch'].images = { mode: 'picked', productIds: [a1, a2], photos: { [a2]: 'https://custom/prawns' } }; });
    const hero = build(ist(TUESDAY, '07:30'), { config, a: availability({ products }) }).hero;
    expect(hero.products).toEqual([
      { id: a1, name: 'Seer Fish', price: 599, mrp: 1295, imageUrl: 'https://img/seer' },
      { id: a2, name: 'Prawns', price: 320, mrp: null, imageUrl: 'https://custom/prawns' }, // MRP below price is not shown
    ]);
  });
});

describe('honest numbers', () => {
  const item = (tag: string, fallbackTag = 'fallback') => ({ ...DEFAULT_CONFIG.items['snack-time'], tag, fallbackTag });
  it('fills only from live data, else the fallback tag', () => {
    const a = availability();
    expect(renderTag(item('From ₹{min}'), stat(5, 10), a)).toBe('From ₹10');
    expect(renderTag(item('From ₹{min}'), { ...stat(5), minPrice: null }, a)).toBe('fallback');
    expect(renderTag(item('Up to {pct}% off'), { ...stat(3), maxDiscountPct: 0 }, a)).toBe('fallback');
    expect(renderTag(item('Order by {cutoff}'), stat(1), a)).toBe('Order by 10 PM');
    expect(renderTag(item('Order by {cutoff}'), stat(1), availability({ preorder: { open: true, cutoffMinute: null } }))).toBe('fallback');
  });
});

describe('refreshAt', () => {
  it('is the next slot edge in IST', () => {
    expect(nextChangeAt(ist(TUESDAY, '07:30'), DEFAULT_CONFIG).toISOString()).toBe(ist(TUESDAY, '09:00').toISOString());
    expect(nextChangeAt(ist(TUESDAY, '23:00'), DEFAULT_CONFIG).toISOString()).toBe(ist('2026-12-16', '06:00').toISOString());
  });
});
