import { describe, expect, it } from 'vitest';
import { buildTodayGrid, nextChangeAt, renderTag } from '../../../packages/today-grid/index.js';
import { CARD_CATALOG } from '../../../packages/today-grid/index.js';
import { DEFAULT_CONFIG, parseConfig, type TodayGridConfig } from '../../../packages/today-grid/index.js';
import { EMPTY_STAT, type Availability, type CardId, type Stat, type UserSummary } from '../../../packages/today-grid/index.js';

const stat = (count: number, minPrice = 20, mrp: number | null = 25, pct: number | null = 20): Stat =>
  ({ count, minPrice, minPriceMrp: mrp, maxDiscountPct: pct, imageUrls: ['https://img/a', 'https://img/b', 'https://img/c'] });
const ALL_CATEGORIES = [...new Set(Object.values(CARD_CATALOG).flatMap(card => card.categories))];

function availability(patch: Partial<Availability> = {}): Availability {
  return {
    openStores: 3,
    categories: Object.fromEntries(ALL_CATEGORIES.map(name => [name, stat(5)])),
    fish: { ...stat(4, 180, 220), arrivedMinute: 6 * 60 + 40 },
    villagePickedToday: stat(5), vegetables: stat(8), fruitsAndVegetables: stat(12, 15, null, null),
    preorder: { open: true, cutoffMinute: 22 * 60 },
    bulk: stat(4), party: stat(3), popularThisWeek: stat(6), brands: stat(4),
    ...patch,
  };
}
const REGULAR: UserSummary = { kind: 'customer', deliveredOrders: 6, usuals: stat(5), offers: stat(3, 40, 60, 33), usualIds: [], offerIds: [] };
const NEW_USER: UserSummary = { ...REGULAR, deliveredOrders: 1 };
const GUEST: UserSummary = { kind: 'guest', deliveredOrders: 0, usuals: EMPTY_STAT, offers: EMPTY_STAT, usualIds: [], offerIds: [] };

// IST wall time -> the UTC instant a server would see (server TZ irrelevant).
const ist = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
const TUESDAY = '2026-12-15'; // day 15, not 1–5, not Thu–Sat
const ids = (grid: { cards: { id: string }[] }) => grid.cards.map(card => card.id);
const build = (now: Date, user = REGULAR, a = availability(), config: TodayGridConfig = DEFAULT_CONFIG) => buildTodayGrid({ now, user, availability: a, config });

describe('slot defaults', () => {
  it.each([
    ['07:30', 'morning', ['milk-breakfast', 'your-usuals', 'breakfast-ready', 'tea-coffee']],
    ['10:00', 'late-morning', ['your-usuals', 'lunch-essentials', 'offers-for-you', 'taste-of-tulunadu']],
    ['14:00', 'afternoon', ['glo-bulk', 'offers-for-you', 'namma-brands', 'home-cleaning']],
    ['17:30', 'evening', ['snack-time', 'cold-drinks', 'your-usuals', 'fish-meat']],
    ['20:30', 'night', ['tomorrow-by-7', 'fish-meat', 'ice-cream', 'your-usuals']],
    ['23:00', 'late-night', ['tomorrow-by-7', 'late-night-snacks', 'daily-needs', 'your-usuals']],
    ['03:00', 'late-night', ['tomorrow-by-7', 'late-night-snacks', 'daily-needs', 'your-usuals']],
  ])('%s IST -> %s', (time, slot, cards) => {
    const grid = build(ist(TUESDAY, time));
    expect(grid.slot).toBe(slot);
    expect(ids(grid)).toEqual(cards);
  });
});

describe('hero', () => {
  it.each([
    ['06:00', 'todays-catch'], ['10:59', 'todays-catch'], ['11:00', 'village-fresh'], ['16:59', 'village-fresh'],
    ['17:00', 'veg-for-tomorrow'], ['21:59', 'veg-for-tomorrow'], ['22:00', 'fresh-by-7'], ['05:59', 'fresh-by-7'],
  ])('%s IST -> %s', (time, hero) => expect(build(ist(TUESDAY, time)).hero.id).toBe(hero));

  it('shows the real landing time and an honest price', () => {
    const hero = build(ist(TUESDAY, '07:30')).hero;
    expect(hero.tag).toBe('Landed 6:40 AM');
    expect(hero.tagText).toBe('#FFD84D');
    expect(hero.price).toEqual({ amount: 180, mrp: 220 });
  });
  it('never strikes a fake MRP', () => {
    const a = availability({ fish: { ...stat(4, 180, 150), arrivedMinute: 400 } });
    expect(build(ist(TUESDAY, '07:30'), REGULAR, a).hero.price).toEqual({ amount: 180, mrp: null });
  });
  it.each([
    ['07:30', { fish: { ...EMPTY_STAT, arrivedMinute: null } }],
    ['07:30', { fish: { ...stat(4), arrivedMinute: null } }],
    ['13:00', { villagePickedToday: EMPTY_STAT }],
    ['18:00', { vegetables: stat(2) }],
    ['23:00', { preorder: { open: false, cutoffMinute: null } }],
  ])('falls back to Fruits & Vegetables at %s when the hero has no data', (time, patch) => {
    const hero = build(ist(TUESDAY, time), REGULAR, availability(patch as Partial<Availability>)).hero;
    expect(hero.id).toBe('fruits-vegetables');
    expect(hero.tag).toBe('Fresh today');
  });
});

describe('modifiers', () => {
  it('1–5th of the month puts Glo Bulk at position 4', () => {
    expect(ids(build(ist('2026-12-03', '07:30')))).toEqual(['milk-breakfast', 'your-usuals', 'breakfast-ready', 'glo-bulk']);
    expect(ids(build(ist('2026-12-03', '14:00')))[0]).toBe('glo-bulk'); // already present: not added twice
  });
  it('Thu–Sat after 17:00 puts Party Orders at position 4', () => {
    expect(ids(build(ist('2026-12-17', '17:30')))[3]).toBe('party-orders'); // Thursday
    expect(ids(build(ist('2026-12-17', '16:59')))).not.toContain('party-orders');
    expect(ids(build(ist('2026-12-20', '18:00')))).not.toContain('party-orders'); // Sunday
  });
  it('an active festival puts Festival Needs at position 3, only within its dates', () => {
    const config = parseConfig({ festival: { active: true, from: '2026-12-14', to: '2026-12-16' } });
    expect(ids(build(ist(TUESDAY, '10:00'), REGULAR, availability(), config))[2]).toBe('festival-needs');
    expect(ids(build(ist('2026-12-18', '10:00'), REGULAR, availability(), config))).not.toContain('festival-needs');
  });
  it('rain after 16:00 puts Rainy Day Cravings at position 3', () => {
    const config = parseConfig({ rain: true });
    expect(ids(build(ist(TUESDAY, '17:30'), REGULAR, availability(), config))[2]).toBe('rainy-day');
    expect(ids(build(ist(TUESDAY, '15:59'), REGULAR, availability(), config))).not.toContain('rainy-day');
  });
  it('combined: 3rd Thursday 18:00, raining, festival — rain wins 3, party wins 4', () => {
    const config = parseConfig({ rain: true, festival: { active: true } });
    expect(ids(build(ist('2026-12-03', '18:00'), REGULAR, availability(), config))).toEqual(['snack-time', 'cold-drinks', 'rainy-day', 'party-orders']);
  });
  it('a new customer sees Popular Near You instead of Your Usuals', () => {
    const cards = ids(build(ist(TUESDAY, '07:30'), NEW_USER));
    expect(cards).toContain('popular-near-you');
    expect(cards).not.toContain('your-usuals');
  });
  it('a guest gets Popular Near You and backups, never Usuals or Offers', () => {
    const cards = ids(build(ist(TUESDAY, '10:00'), GUEST));
    expect(cards).not.toContain('your-usuals');
    expect(cards).not.toContain('offers-for-you');
    expect(cards[0]).toBe('popular-near-you');
    expect(cards).toHaveLength(4);
  });
});

describe('data checks and backups', () => {
  it('replaces a failing card with the first passing backup, in order', () => {
    const a = availability({ bulk: EMPTY_STAT });
    expect(ids(build(ist(TUESDAY, '14:00'), REGULAR, a))).toEqual(['daily-essentials', 'offers-for-you', 'namma-brands', 'home-cleaning']);
  });
  it('skips backups that also fail', () => {
    const categories = { ...availability().categories, 'Rice, Atta & Dal': EMPTY_STAT, 'Oils & Ghee': EMPTY_STAT, 'Milk & Dairy Drinks': EMPTY_STAT, 'Bath & Body': EMPTY_STAT, 'Oral Care': EMPTY_STAT, Laundry: EMPTY_STAT };
    const a = availability({ bulk: EMPTY_STAT, categories });
    expect(ids(build(ist(TUESDAY, '14:00'), REGULAR, a))[0]).toBe('snack-time');
  });
  it('never repeats a card and returns fewer than 4 when backups run out', () => {
    const none = Object.fromEntries(ALL_CATEGORIES.map(name => [name, EMPTY_STAT]));
    const a = availability({ categories: none, bulk: EMPTY_STAT, brands: EMPTY_STAT });
    const grid = build(ist(TUESDAY, '14:00'), { ...REGULAR, offers: EMPTY_STAT }, a);
    expect(grid.cards).toEqual([]);
    const some = availability({ categories: { ...none, 'Home Cleaners': stat(4) }, bulk: EMPTY_STAT });
    const cards = ids(build(ist(TUESDAY, '14:00'), REGULAR, some));
    expect(cards).toEqual(['offers-for-you', 'namma-brands', 'home-cleaning']);
    expect(new Set(cards).size).toBe(cards.length);
  });
  it('Usuals needs 2+ delivered orders and 3+ repeat items in stock', () => {
    expect(ids(build(ist(TUESDAY, '10:00'), { ...REGULAR, usuals: stat(2) }))).not.toContain('your-usuals');
  });
  it('late-night cards need a shop open now', () => {
    expect(ids(build(ist(TUESDAY, '23:00'), REGULAR, availability({ openStores: 0 })))).not.toContain('late-night-snacks');
  });
  it('a disabled card is treated as failing', () => {
    const config = parseConfig({ cards: { 'tea-coffee': { enabled: false } } });
    expect(ids(build(ist(TUESDAY, '07:30'), REGULAR, availability(), config))).toEqual(['milk-breakfast', 'your-usuals', 'breakfast-ready', 'daily-essentials']);
  });
});

describe('honest numbers', () => {
  const def = (id: CardId) => ({ ...CARD_CATALOG[id], id });
  it('fills numbers only from live data, else the fallback tag', () => {
    const a = availability();
    expect(renderTag(def('snack-time'), stat(5, 10), a)).toBe('From ₹10');
    expect(renderTag(def('snack-time'), { ...stat(5), minPrice: null }, a)).toBe('Snack break');
    expect(renderTag(def('offers-for-you'), stat(3, 40, 60, 33), a)).toBe('Up to 33% off');
    expect(renderTag(def('offers-for-you'), { ...stat(3), maxDiscountPct: 0 }, a)).toBe('Offers today');
    expect(renderTag(def('tomorrow-by-7'), stat(1), a)).toBe('Order by 10:00 PM');
    expect(renderTag(def('tomorrow-by-7'), stat(1), availability({ preorder: { open: true, cutoffMinute: null } }))).toBe('By 7 AM');
  });
  it('tap target carries the admin-edited category list', () => {
    const config = parseConfig({ cards: { 'tea-coffee': { categories: ['Tea & Coffee'] } } });
    const card = build(ist(TUESDAY, '07:30'), REGULAR, availability(), config).cards.find(c => c.id === 'tea-coffee');
    expect(card?.target).toEqual({ type: 'categories', categories: ['Tea & Coffee'] });
  });
});

describe('IST boundaries and server clock', () => {
  it.each([['05:59', 'late-night'], ['06:00', 'morning'], ['08:59', 'morning'], ['09:00', 'late-morning'], ['21:59', 'night'], ['22:00', 'late-night']])(
    '%s IST is %s', (time, slot) => expect(build(ist(TUESDAY, time)).slot).toBe(slot));
  it('uses India time even when the UTC date differs', () => {
    // 2026-12-15 01:00 IST is still 2026-12-14 in UTC.
    const now = new Date('2026-12-14T19:30:00Z');
    expect(build(now).slot).toBe('late-night');
    expect(build(new Date('2026-12-31T19:00:00Z')).cards.map(c => c.id)).toContain('glo-bulk'); // Jan 1 in IST
  });
});

describe('config parsing', () => {
  it('ignores invalid fields instead of breaking Home', () => {
    const config = parseConfig({ slots: [{ key: 'x', from: 'bad', to: 9, cards: ['nope'] }], backups: ['nope'], cards: { 'tea-coffee': { accent: 'red', title: '' } }, rain: 'yes' });
    expect(config.slots).toEqual(DEFAULT_CONFIG.slots);
    expect(config.backups).toEqual(DEFAULT_CONFIG.backups);
    expect(config.cards['tea-coffee']).toEqual({});
    expect(config.rain).toBe(false);
  });
});

describe('refreshAt', () => {
  it('is the next slot or hero edge in IST', () => {
    expect(nextChangeAt(ist(TUESDAY, '07:30'), DEFAULT_CONFIG).toISOString()).toBe(ist(TUESDAY, '09:00').toISOString());
    expect(nextChangeAt(ist(TUESDAY, '10:15'), DEFAULT_CONFIG).toISOString()).toBe(ist(TUESDAY, '11:00').toISOString());
    expect(nextChangeAt(ist(TUESDAY, '23:00'), DEFAULT_CONFIG).toISOString()).toBe(ist('2026-12-16', '06:00').toISOString());
  });
});
