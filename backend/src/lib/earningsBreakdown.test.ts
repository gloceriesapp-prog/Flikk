import { describe, expect, it } from 'vitest';
import { extraStopCount, riderDeliveryPayout } from './earningsBreakdown.js';

const unset = { riderBasePayout: 0, riderExtraStopPayout: 0, extraStopFee: 15 };
const set = { riderBasePayout: 30, riderExtraStopPayout: 12, extraStopFee: 15 };

describe('riderDeliveryPayout (mirror of rider_delivery_payout, migration 108)', () => {
  it('pays exactly the delivery fee while no minimum payout is set', () => {
    expect(riderDeliveryPayout(25, 0, unset)).toEqual({ amount: 25, base: 25, extraStop: 0 });
    // A 3-shop trip charged 25 + 2 x 15: the surcharge is the extra-stop share.
    expect(riderDeliveryPayout(55, 2, unset)).toEqual({ amount: 55, base: 25, extraStop: 30 });
  });
  it('never reports a negative base for a free-delivery trip in the old mode', () => {
    expect(riderDeliveryPayout(0, 2, unset)).toEqual({ amount: 0, base: 0, extraStop: 0 });
  });
  it('pays the minimum payout on a free-delivery order', () => {
    expect(riderDeliveryPayout(0, 0, set)).toEqual({ amount: 30, base: 30, extraStop: 0 });
  });
  it('pays the delivery fee when it is above the minimum', () => {
    expect(riderDeliveryPayout(42.5, 0, set)).toEqual({ amount: 42.5, base: 42.5, extraStop: 0 });
  });
  it('adds the extra-shop payout per extra shop', () => {
    expect(riderDeliveryPayout(0, 2, set)).toEqual({ amount: 54, base: 30, extraStop: 24 });
    expect(riderDeliveryPayout(40, 1, set)).toEqual({ amount: 42, base: 30, extraStop: 12 });
  });
  it('does not pay the customer extra-shop fee on top of the extra-shop payout', () => {
    // Fee 41 = tier 26 + one extra shop at 15: base compares 30 with 26, not 41.
    expect(riderDeliveryPayout(41, 1, set)).toEqual({ amount: 42, base: 30, extraStop: 12 });
    expect(riderDeliveryPayout(60, 1, set)).toEqual({ amount: 57, base: 45, extraStop: 12 });
  });
  it('treats a configured extra-stop fee of 0 as no surcharge share', () => {
    expect(riderDeliveryPayout(25, 2, { ...unset, extraStopFee: 0 })).toEqual({ amount: 25, base: 25, extraStop: 0 });
  });
  it('ignores malformed input', () => {
    expect(riderDeliveryPayout(Number.NaN, -3, set)).toEqual({ amount: 30, base: 30, extraStop: 0 });
  });
});

describe('extraStopCount', () => {
  it('counts distinct shops on live legs beyond the first', () => {
    expect(extraStopCount([{ store_id: 'a', status: 'packed' }])).toBe(0);
    expect(extraStopCount([{ store_id: 'a', status: 'packed' }, { store_id: 'b', status: 'placed' }, { store_id: 'c', status: 'cancelled' }])).toBe(1);
    expect(extraStopCount([])).toBe(0);
  });
});
