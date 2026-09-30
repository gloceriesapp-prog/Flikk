import { describe, it, expect } from 'vitest';
import { RIDER_DELIVERY_FAILURE_REASON_CODES, isRiderDeliveryFailureReasonCode } from './deliveryFailureReasons.js';
// Reach across to the shared source directly (backend isn't a @gloceries/shared
// member, so this is the only way to assert the mirror hasn't drifted). Path
// is relative to this file: backend/src/lib -> packages/shared/src/orders.
import { RIDER_DELIVERY_FAILURE_REASONS } from '../../../packages/shared/src/orders/deliveryFailureReasons.js';

describe('rider delivery-failure reason codes', () => {
  it('accepts known codes and rejects everything else', () => {
    expect(isRiderDeliveryFailureReasonCode('customer_unreachable')).toBe(true);
    expect(isRiderDeliveryFailureReasonCode('other')).toBe(true);
    expect(isRiderDeliveryFailureReasonCode('store_closed')).toBe(false); // pickup-phase cancel reason, not a drop failure
    expect(isRiderDeliveryFailureReasonCode('')).toBe(false);
    expect(isRiderDeliveryFailureReasonCode(undefined)).toBe(false);
    expect(isRiderDeliveryFailureReasonCode(42)).toBe(false);
  });

  it('stays identical to the @gloceries/shared list (manual mirror guard)', () => {
    const sharedCodes = RIDER_DELIVERY_FAILURE_REASONS.map((r) => r.code);
    expect([...RIDER_DELIVERY_FAILURE_REASON_CODES]).toEqual(sharedCodes);
  });
});
