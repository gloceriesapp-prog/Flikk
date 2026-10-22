import { describe, expect, it } from 'vitest';
import { productStockTracker, stockPresentation } from '../../../apps/partner-dashboard/src/components/inventory/stockPresentation';

const product = { is_in_stock: true, stock_status: 'in_stock' as const, stock_quantity: 8, stock_tracking_enabled: true };
describe('inventory stock presentation', () => {
  it('uses the same running-low threshold as the inventory filter', () => {
    expect(stockPresentation({ ...product, stock_quantity: 1 }).state).toBe('low');
    expect(stockPresentation({ ...product, stock_quantity: 4 }).state).toBe('low');
    expect(stockPresentation({ ...product, stock_quantity: 5 }).state).toBe('available');
  });
  it('marks zero and manually unavailable products red', () => {
    expect(stockPresentation({ ...product, stock_quantity: 0 }).state).toBe('out');
    expect(stockPresentation({ ...product, is_in_stock: false }).state).toBe('out');
  });
  it('never invents counts for untracked, invalid or legacy quantities', () => {
    for (const overrides of [{ stock_tracking_enabled: false }, { stock_tracking_enabled: undefined }, { stock_quantity: null }, { stock_quantity: -1 }, { stock_quantity: NaN }]) {
      expect(stockPresentation({ ...product, ...overrides })).toMatchObject({ state: 'unknown', quantity: null, color: 'bg-gray-200' });
    }
  });
});

it('builds per-product tracker segments without changing exact quantities', () => {
  const low = productStockTracker({ ...product, stock_quantity: 3 });
  expect(low.segments.filter(s => s.color === 'bg-yellow-500')).toHaveLength(3);
  const high = productStockTracker({ ...product, stock_quantity: 42 });
  expect(high.stock.quantity).toBe(42);
  expect(high.segments.filter(s => s.color === 'bg-emerald-600')).toHaveLength(30);
  expect(productStockTracker({ ...product, stock_quantity: 0 }).segments.every(s => s.color === 'bg-red-600')).toBe(true);
  expect(productStockTracker({ ...product, stock_tracking_enabled: false }).segments.every(s => s.color === 'bg-gray-200')).toBe(true);
});
