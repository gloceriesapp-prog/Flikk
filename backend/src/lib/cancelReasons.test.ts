import { describe, it, expect } from 'vitest';
import { RIDER_CANCEL_REASON_CODES, isRiderCancelReasonCode } from './cancelReasons.js';
// Reach across to the shared source directly (backend isn't a @gloceries/shared
// member, so this is the only way to assert the mirror hasn't drifted). Path
// is relative to this file: backend/src/lib -> packages/shared/src/orders.
import { RIDER_CANCEL_REASONS } from '../../../packages/shared/src/orders/cancelReasons.js';

describe('rider cancel reason codes', () => {
  it('accepts known codes and rejects everything else', () => {
    expect(isRiderCancelReasonCode('store_closed')).toBe(true);
    expect(isRiderCancelReasonCode('other')).toBe(true);
    expect(isRiderCancelReasonCode('customer_unreachable')).toBe(false); // drop-phase, intentionally gone
    expect(isRiderCancelReasonCode('')).toBe(false);
    expect(isRiderCancelReasonCode(undefined)).toBe(false);
    expect(isRiderCancelReasonCode(42)).toBe(false);
  });

  it('stays identical to the @gloceries/shared list (manual mirror guard)', () => {
    const sharedCodes = RIDER_CANCEL_REASONS.map((r) => r.code);
    expect([...RIDER_CANCEL_REASON_CODES]).toEqual(sharedCodes);
  });
});
