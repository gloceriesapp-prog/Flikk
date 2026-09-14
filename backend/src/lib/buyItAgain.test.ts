import { describe, expect, it } from 'vitest';
import { rankRepeatPurchases, reorderByRank } from './buyItAgain.js';

describe('rankRepeatPurchases', () => {
  it('ranks a product bought more times above one bought once, even if the single purchase is more recent', () => {
    const ranked = rankRepeatPurchases(
      [
        { product_id: 'atta', placed_at: '2026-01-01T00:00:00Z' },
        { product_id: 'atta', placed_at: '2026-01-10T00:00:00Z' },
        { product_id: 'ghee', placed_at: '2026-01-20T00:00:00Z' },
      ],
      10,
    );
    expect(ranked).toEqual(['atta', 'ghee']);
  });

  it('breaks a tie in purchase count by most-recently-ordered first', () => {
    const ranked = rankRepeatPurchases(
      [
        { product_id: 'rice', placed_at: '2026-01-01T00:00:00Z' },
        { product_id: 'dal', placed_at: '2026-01-15T00:00:00Z' },
      ],
      10,
    );
    expect(ranked).toEqual(['dal', 'rice']);
  });

  it('caps the result at the given limit', () => {
    const items = ['a', 'b', 'c', 'd'].map((id) => ({ product_id: id, placed_at: '2026-01-01T00:00:00Z' }));
    expect(rankRepeatPurchases(items, 2)).toHaveLength(2);
  });

  it('returns an empty array for a customer with no delivered order items', () => {
    expect(rankRepeatPurchases([], 10)).toEqual([]);
  });
});

describe('reorderByRank', () => {
  it('reorders rows to match the ranked id order, not their original order', () => {
    const rows = [
      { id: 'ghee', name: 'Ghee' },
      { id: 'atta', name: 'Atta' },
    ];
    expect(reorderByRank(['atta', 'ghee'], rows)).toEqual([
      { id: 'atta', name: 'Atta' },
      { id: 'ghee', name: 'Ghee' },
    ]);
  });

  it('drops a ranked id with no matching row instead of leaving a hole', () => {
    const rows = [{ id: 'atta', name: 'Atta' }];
    expect(reorderByRank(['atta', 'discontinued-product'], rows)).toEqual([{ id: 'atta', name: 'Atta' }]);
  });
});
