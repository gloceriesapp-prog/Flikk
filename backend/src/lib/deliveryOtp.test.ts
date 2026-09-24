import { describe, expect, it } from 'vitest';
import { generateDeliveryOtp, isDeliveryOtpValid } from './deliveryOtp.js';

describe('generateDeliveryOtp', () => {
  it('always returns a 4-digit numeric string', () => {
    for (let i = 0; i < 500; i++) {
      const otp = generateDeliveryOtp();
      expect(otp).toMatch(/^\d{4}$/);
    }
  });
});

describe('isDeliveryOtpValid', () => {
  it('accepts an exact match', () => {
    expect(isDeliveryOtpValid('1234', '1234')).toBe(true);
  });

  it('rejects a mismatch', () => {
    expect(isDeliveryOtpValid('1234', '9999')).toBe(false);
  });

  it('rejects when no code was ever issued', () => {
    expect(isDeliveryOtpValid(null, '1234')).toBe(false);
    expect(isDeliveryOtpValid(undefined, '1234')).toBe(false);
  });

  it('rejects a missing/blank input even against a real code', () => {
    expect(isDeliveryOtpValid('1234', undefined)).toBe(false);
    expect(isDeliveryOtpValid('1234', '')).toBe(false);
  });
});
