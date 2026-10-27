import { assignDistinctRows, assignHomeRows } from '../src/screens/home/sections/distinctRows';
import { COPY_KEYS, copyDefault } from '../../../packages/home-content/copyKeys.js';

const p = (...ids: string[]) => ids.map((id) => ({ id }));

test('home rows never repeat a product and hide rows that would only duplicate another', () => {
  const deals = p('d1', 'd2', 'd3', 'd4', 'd5', 'd6');
  const popular = p('a', 'b', 'c');
  const rows = assignDistinctRows(['priceDrops', 'bestDeals', 'savings', 'trending', 'mostBought'] as const, {
    priceDrops: { feed: deals, cap: 4 },
    bestDeals: { feed: deals, cap: 6 },
    savings: { feed: deals, cap: 8 },
    trending: { feed: popular, cap: 6 },
    mostBought: { feed: popular, cap: 6 }, // 30d == 7d with sparse data
  });
  expect(rows.priceDrops.map((x) => x.id)).toEqual(['d1', 'd2', 'd3', 'd4']);
  expect(rows.bestDeals.map((x) => x.id)).toEqual(['d5', 'd6']);
  expect(rows.savings).toEqual([]);
  expect(rows.trending).toHaveLength(3);
  expect(rows.mostBought).toEqual([]);
});

test('every home section copy key has a registered default the admin page lists', () => {
  for (const key of ['trending', 'mostBought', 'dealsForYou', 'todaysBestDeals', 'priceDrops', 'everydayEssentials', 'newOnGloceries', 'topRatedStores']) {
    expect(copyDefault(`home.${key}.title`)).not.toBe('');
  }
  expect(Object.keys(COPY_KEYS).every((k) => /^[a-z0-9]+(\.[a-zA-Z0-9]+)+$/.test(k))).toBe(true);
});

const one = (id: string, isAvailable = true) => ({ id, isAvailable });
const feed = ['a', 'b', 'c', 'd', 'e'].map((id) => one(id));

describe('assignHomeRows', () => {
  it('without pins behaves exactly like assignDistinctRows', () => {
    const rows = { deals: { feed, cap: 2 }, trending: { feed, cap: 2 } };
    expect(assignHomeRows(['deals', 'trending'], rows, {}, new Set())).toEqual(assignDistinctRows(['deals', 'trending'], rows));
  });

  it('puts pins first, fills from the feed up to the cap, and never repeats a product', () => {
    const rows = { deals: { feed, cap: 3 }, trending: { feed, cap: 3 } };
    const out = assignHomeRows(['deals', 'trending'], rows, { trending: [one('c'), one('x')] }, new Set());
    // deals claims first from the feed but skips the pinned 'c'.
    expect(out.deals.map((r) => r.id)).toEqual(['a', 'b', 'd']);
    expect(out.trending.map((r) => r.id)).toEqual(['c', 'x', 'e']);
    const all = [...out.deals, ...out.trending].map((r) => r.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('pinned-only rows show just their pins; a single pin still shows; sold-out pins are skipped', () => {
    const rows = { deals: { feed, cap: 4 }, trending: { feed, cap: 4 } };
    const out = assignHomeRows(['deals', 'trending'], rows, { trending: [one('z', false), one('y')] }, new Set(['trending']));
    expect(out.trending.map((r) => r.id)).toEqual(['y']);
    expect(out.deals.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('caps pins at the row size', () => {
    const rows = { deals: { feed, cap: 2 } };
    expect(assignHomeRows(['deals'], rows, { deals: [one('x'), one('y'), one('w')] }, new Set()).deals.map((r) => r.id)).toEqual(['x', 'y']);
  });
});
