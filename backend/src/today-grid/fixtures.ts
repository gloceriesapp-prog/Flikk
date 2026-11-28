// Shared test inputs for the grid engine (not a test file itself).
import { DEFAULT_ITEMS, EMPTY_STAT, type Availability, type Stat, type UserSummary } from '../../../packages/today-grid/index.js';

export const stat = (count: number, minPrice = 20, mrp: number | null = 25, pct: number | null = 20): Stat =>
  ({ count, minPrice, minPriceMrp: mrp, maxDiscountPct: pct, imageUrls: ['https://img/a', 'https://img/b', 'https://img/c'] });
export const ALL_CATEGORIES = [...new Set(Object.values(DEFAULT_ITEMS).flatMap(item => item.categories))];
export function availability(patch: Partial<Availability> = {}): Availability {
  return {
    openStores: 3,
    categories: Object.fromEntries(ALL_CATEGORIES.map(name => [name, stat(5)])),
    fish: { ...stat(4, 180, 220), arrivedMinute: 6 * 60 + 40 },
    villagePickedToday: stat(5), vegetables: stat(8), fruitsAndVegetables: stat(12, 15, null, null),
    preorder: { open: true, cutoffMinute: 22 * 60 },
    bulk: stat(4), party: stat(3), popularThisWeek: stat(6),
    localBrands: { count: 4, brandIds: ['b1', 'b2', 'b3', 'b4'], logoUrls: ['https://logo/1', 'https://logo/2'] },
    productImages: { p1: 'https://img/p1', p2: 'https://img/p2' },
    ...patch,
  };
}
export const REGULAR: UserSummary = { kind: 'customer', deliveredOrders: 6, usuals: stat(5), offers: stat(3, 40, 60, 33), usualIds: [], offerIds: [] };
export const NEW_USER: UserSummary = { ...REGULAR, deliveredOrders: 1 };
export const GUEST: UserSummary = { kind: 'guest', deliveredOrders: 0, usuals: EMPTY_STAT, offers: EMPTY_STAT, usualIds: [], offerIds: [] };
export const NO_FESTIVAL = { active: false, name: null };
// IST wall time -> the UTC instant a server sees (server time zone irrelevant).
export const ist = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
export const TUESDAY = '2026-12-15';
