import { describe, expect, it } from 'vitest';
import { priceCheckoutItems, type CheckoutProduct } from './checkoutItems.js';
import { daysAhead, formatDeliveryWindow, parsePreorder, preorderWindow } from './preorders.js';

const idli: CheckoutProduct = { id: '00000000-0000-4000-8000-0000000000a1', store_id: 'shop', is_in_stock: true, price: 40, unit: '4 pcs',
  preorder_enabled: true, preorder_min_qty: 10, preorder_lead_days: 1, product_variants: [] };
const chicken: CheckoutProduct = { ...idli, id: '00000000-0000-4000-8000-0000000000a2', preorder_min_qty: 2, preorder_lead_days: 2 };
const milk: CheckoutProduct = { ...idli, id: '00000000-0000-4000-8000-0000000000a3', preorder_enabled: false };
const line = (product: CheckoutProduct, quantity: number) => ({ product_id: product.id, variant_id: null, quantity });
const slot = { id: '00000000-0000-4000-8000-0000000000b1', label: '7 – 9 AM', starts_minute: 420, ends_minute: 540 };
// 2026-11-06 22:00 IST.
const now = new Date('2026-11-06T16:30:00Z');

describe('pre-order cart', () => {
  it('prices a pre-order cart and carries each product\'s notice', () => {
    const priced = priceCheckoutItems([line(idli, 10), line(chicken, 2)], [idli, chicken]);
    expect(priced.map((p) => p.preorder_lead_days)).toEqual([1, 2]);
    expect(priceCheckoutItems([line(milk, 1)], [milk])[0]!.preorder_lead_days).toBeNull();
  });
  it('refuses mixing, other shops and less than the bulk minimum', () => {
    expect(() => priceCheckoutItems([line(idli, 10), line(milk, 1)], [idli, milk])).toThrow(/checked out on their own/);
    expect(() => priceCheckoutItems([line(idli, 10), line({ ...chicken, store_id: 'other' }, 2)], [idli, { ...chicken, store_id: 'other' }]))
      .toThrow(/one shop/);
    expect(() => priceCheckoutItems([line(idli, 9)], [idli])).toThrow(/at least 10/);
  });
});

describe('pre-order delivery window', () => {
  it('counts days in India time', () => {
    expect(daysAhead('2026-11-07', now)).toBe(1);
    // 00:30 IST on the 7th is already the 7th.
    expect(daysAhead('2026-11-07', new Date('2026-11-06T19:00:00Z'))).toBe(0);
  });
  it('turns a day + slot into the IST window', () => {
    expect(preorderWindow({ date: '2026-11-07', slot_id: slot.id }, slot, 1, now))
      .toEqual({ deliver_from: '2026-11-07T01:30:00.000Z', deliver_until: '2026-11-07T03:30:00.000Z' });
    expect(formatDeliveryWindow('2026-11-07T01:30:00.000Z', '2026-11-07T03:30:00.000Z')).toMatch(/Sat.*7.*Nov.*7:00.*9:00/i);
  });
  it('enforces notice, the 5-day window and a live slot', () => {
    expect(() => preorderWindow({ date: '2026-11-06', slot_id: slot.id }, slot, 1, now)).toThrow(/from tomorrow/);
    expect(() => preorderWindow({ date: '2026-11-07', slot_id: slot.id }, slot, 2, now)).toThrow(/2 days' notice/);
    // Today through 4 days ahead.
    expect(() => preorderWindow({ date: '2026-11-11', slot_id: slot.id }, slot, 0, now)).toThrow(/next 5 days/);
    expect(preorderWindow({ date: '2026-11-10', slot_id: slot.id }, slot, 0, now).deliver_from).toBe('2026-11-10T01:30:00.000Z');
    expect(() => preorderWindow({ date: '2026-11-07', slot_id: slot.id }, null, 1, now)).toThrow(/no longer offered/);
  });
  it('books today only for a slot at least 2 hours away', () => {
    const evening = { ...slot, label: '6 – 8 PM', starts_minute: 1080, ends_minute: 1200 };
    // 2026-11-06 14:00 IST: 6 PM is 4 hours away, 7 AM has passed.
    const afternoon = new Date('2026-11-06T08:30:00Z');
    expect(preorderWindow({ date: '2026-11-06', slot_id: slot.id }, evening, 0, afternoon).deliver_from).toBe('2026-11-06T12:30:00.000Z');
    expect(() => preorderWindow({ date: '2026-11-06', slot_id: slot.id }, slot, 0, afternoon)).toThrow(/too soon/);
    // 17:00 IST: 6 PM is only 1 hour away.
    expect(() => preorderWindow({ date: '2026-11-06', slot_id: slot.id }, evening, 0, new Date('2026-11-06T11:30:00Z'))).toThrow(/too soon/);
  });
  it('validates the request shape', () => {
    expect(parsePreorder(undefined)).toBeNull();
    expect(() => parsePreorder({ date: '7 Nov', slot_id: slot.id })).toThrow(/delivery day/);
    expect(() => parsePreorder({ date: '2026-11-07', slot_id: 'x' })).toThrow(/delivery day/);
  });
});
