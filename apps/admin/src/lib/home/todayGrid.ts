// Admin side of the "Today on Gloceries" grid. The rules themselves come from
// packages/today-grid (the same pure function the backend endpoint runs), so
// the preview shows exactly what customers get for a given time and user.
import {
  buildTodayGrid, CARD_CATALOG, CARD_IDS, DEFAULT_CONFIG, EMPTY_STAT, parseConfig,
  type Availability, type CardId, type Stat, type TodayGrid, type TodayGridConfig, type UserSummary,
} from '../../../../../packages/today-grid/index.js';

export { CARD_CATALOG, CARD_IDS, DEFAULT_CONFIG, parseConfig };
export type { CardId, TodayGrid, TodayGridConfig };

export const toClock = (minute: number) => `${String(Math.floor((minute % 1440) / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function fromClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[2]) < 60 && minute <= 1440 ? minute : null;
}

// Preview inputs: a "full" sample where every card has data, and a
// "limited" one where only a few pass, to check fallbacks and short grids.
const sampleStat = (count: number, min = 25, mrp: number | null = 30, pct: number | null = 15): Stat =>
  ({ count, minPrice: min, minPriceMrp: mrp, maxDiscountPct: pct, imageUrls: [] });
export function sampleAvailability(kind: 'full' | 'limited'): Availability {
  const names = [...new Set(Object.values(CARD_CATALOG).flatMap((card) => card.categories))];
  const full = kind === 'full';
  return {
    openStores: 3,
    categories: Object.fromEntries(names.map((name) => [name, full || name === 'Chips & Namkeen' ? sampleStat(6) : EMPTY_STAT])),
    fish: { ...sampleStat(4, 180, 220), arrivedMinute: full ? 6 * 60 + 40 : null },
    villagePickedToday: full ? sampleStat(5) : EMPTY_STAT,
    vegetables: sampleStat(full ? 8 : 2),
    fruitsAndVegetables: sampleStat(12, 15, null, null),
    preorder: full ? { open: true, cutoffMinute: 4 * 60 } : { open: false, cutoffMinute: null },
    bulk: full ? sampleStat(4) : EMPTY_STAT,
    party: full ? sampleStat(3) : EMPTY_STAT,
    popularThisWeek: sampleStat(6),
    brands: sampleStat(4),
  };
}
export type SampleUser = 'new' | 'regular' | 'guest';
export function sampleUser(kind: SampleUser): UserSummary {
  if (kind === 'guest') return { kind: 'guest', deliveredOrders: 0, usuals: EMPTY_STAT, offers: EMPTY_STAT, usualIds: [], offerIds: [] };
  return { kind: 'customer', deliveredOrders: kind === 'new' ? 1 : 6, usuals: sampleStat(5), offers: sampleStat(3, 40, 60, 33), usualIds: [], offerIds: [] };
}

export function previewGrid(input: { date: string; time: string; user: SampleUser; data: 'full' | 'limited'; config: TodayGridConfig }): TodayGrid | null {
  const now = new Date(`${input.date}T${input.time}:00+05:30`);
  if (Number.isNaN(now.getTime())) return null;
  return buildTodayGrid({ now, user: sampleUser(input.user), availability: sampleAvailability(input.data), config: input.config });
}
