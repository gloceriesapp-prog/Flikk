import { assignDistinctRows } from '../src/screens/home/sections/distinctRows';
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
