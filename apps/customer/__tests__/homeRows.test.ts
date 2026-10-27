import { assignDistinctRows, assignHomeRows } from '../src/screens/home/sections/distinctRows';

const p = (id: string, isAvailable = true) => ({ id, isAvailable });
const feed = ['a', 'b', 'c', 'd', 'e'].map((id) => p(id));

describe('assignHomeRows', () => {
  it('without pins behaves exactly like assignDistinctRows', () => {
    const rows = { deals: { feed, cap: 2 }, trending: { feed, cap: 2 } };
    expect(assignHomeRows(['deals', 'trending'], rows, {}, new Set())).toEqual(assignDistinctRows(['deals', 'trending'], rows));
  });

  it('puts pins first, fills from the feed up to the cap, and never repeats a product', () => {
    const rows = { deals: { feed, cap: 3 }, trending: { feed, cap: 3 } };
    const out = assignHomeRows(['deals', 'trending'], rows, { trending: [p('c'), p('x')] }, new Set());
    // deals claims first from the feed but skips the pinned 'c'.
    expect(out.deals.map((r) => r.id)).toEqual(['a', 'b', 'd']);
    expect(out.trending.map((r) => r.id)).toEqual(['c', 'x', 'e']);
    const all = [...out.deals, ...out.trending].map((r) => r.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('pinned-only rows show just their pins; a single pin still shows; sold-out pins are skipped', () => {
    const rows = { deals: { feed, cap: 4 }, trending: { feed, cap: 4 } };
    const out = assignHomeRows(['deals', 'trending'], rows, { trending: [p('z', false), p('y')] }, new Set(['trending']));
    expect(out.trending.map((r) => r.id)).toEqual(['y']);
    expect(out.deals.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('caps pins at the row size', () => {
    const rows = { deals: { feed, cap: 2 } };
    expect(assignHomeRows(['deals'], rows, { deals: [p('x'), p('y'), p('w')] }, new Set()).deals.map((r) => r.id)).toEqual(['x', 'y']);
  });
});
