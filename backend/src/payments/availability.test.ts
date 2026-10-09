import { describe, expect, it } from 'vitest';
import { parseCheckoutControls } from '../lib/platformSettings.js';
import { resolvePaymentAvailability } from './availability.js';

const open = { codDisabled: false, onlinePaymentsDisabled: false, paymentsConfigured: true };

describe('payment availability', () => {
  it('follows the admin switches when the env allows both methods', () => {
    expect(resolvePaymentAvailability({ codEnabled: true, onlinePaymentsEnabled: true, minOrderValue: 0 }, open)).toEqual({ cod: true, online: true, minOrderValue: 0 });
    expect(resolvePaymentAvailability({ codEnabled: false, onlinePaymentsEnabled: true, minOrderValue: 99 }, open)).toEqual({ cod: false, online: true, minOrderValue: 99 });
    expect(resolvePaymentAvailability({ codEnabled: true, onlinePaymentsEnabled: false, minOrderValue: 0 }, open)).toMatchObject({ cod: true, online: false });
  });
  it('keeps the env as a hard kill over the admin switches', () => {
    const on = { codEnabled: true, onlinePaymentsEnabled: true, minOrderValue: 0 };
    expect(resolvePaymentAvailability(on, { ...open, paymentsConfigured: false })).toMatchObject({ cod: true, online: false });
    expect(resolvePaymentAvailability(on, { ...open, onlinePaymentsDisabled: true })).toMatchObject({ online: false });
    expect(resolvePaymentAvailability(on, { ...open, codDisabled: true })).toMatchObject({ cod: false, online: true });
  });
  it('falls back to both methods on and no minimum for a missing or pre-117 row', () => {
    expect(parseCheckoutControls(null)).toEqual({ codEnabled: true, onlinePaymentsEnabled: true, minOrderValue: 0 });
    expect(parseCheckoutControls({ commission_rate: 0.06 })).toEqual({ codEnabled: true, onlinePaymentsEnabled: true, minOrderValue: 0 });
    // PostgREST serializes numeric as a string.
    expect(parseCheckoutControls({ cod_enabled: false, online_payments_enabled: true, min_order_value: '149.50' }))
      .toEqual({ codEnabled: false, onlinePaymentsEnabled: true, minOrderValue: 149.5 });
  });
});
