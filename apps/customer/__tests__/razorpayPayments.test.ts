import { NativeModules } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { razorpayOptions, razorpayResult } from '../src/payments/razorpayOptions';
import { isNativeCheckoutOpen, openRazorpayCheckout } from '../src/payments/openRazorpayCheckout';
import type { RazorpayOrder } from '../src/api/payments';

const now = Date.parse('2026-10-13T12:00:00Z');
const order: RazorpayOrder = {
  provider: 'razorpay', providerOrderId: 'order_abc123', keyId: 'rzp_test_abc123',
  amount: 123.45, amountPaise: 12345, currency: 'INR', environment: 'sandbox',
  expiresAt: new Date(now + 180_000).toISOString(),
};
const result = { razorpay_order_id: order.providerOrderId, razorpay_payment_id: 'pay_abc123', razorpay_signature: 'a'.repeat(64) };

describe('server-owned Razorpay checkout options', () => {
  it('uses the saved provider order and integer paise amount', () => {
    expect(razorpayOptions(order, 'online', now)).toMatchObject({
      key: order.keyId, order_id: order.providerOrderId, amount: 12345, currency: 'INR', timeout: 180,
    });
  });
  it('counts elapsed background time instead of resetting the reservation', () => {
    expect(razorpayOptions(order, 'online', now + 125_000).timeout).toBe(55);
    expect(() => razorpayOptions(order, 'online', now + 180_000)).toThrow('expired');
  });
  it('rejects tampered amounts, currency, key environment and invalid expiry', () => {
    for (const patch of [{ amountPaise: 100 }, { amount: NaN }, { currency: 'USD' },
      { environment: 'production' }, { keyId: 'secret' }, { expiresAt: 'invalid' }]) {
      expect(() => razorpayOptions({ ...order, ...patch } as RazorpayOrder, 'online', now)).toThrow();
    }
  });
  it('prefills documented methods only with real email and contact', () => {
    expect(razorpayOptions(order, 'upi_app:gpay', now).prefill).not.toHaveProperty('method');
    const customer = { contact: '+919000000000', email: 'customer@example.com' };
    expect(razorpayOptions({ ...order, customer }, 'upi_app:gpay', now).prefill.method).toBe('upi');
    expect(razorpayOptions({ ...order, customer }, 'netbanking', now).prefill.method).toBe('netbanking');
    expect(razorpayOptions(order, 'card', now)).not.toHaveProperty('upi');
  });
  it('accepts only complete evidence for the exact stored provider order', () => {
    expect(razorpayResult(result, order.providerOrderId)).toEqual(result);
    for (const value of [null, {}, { ...result, razorpay_signature: '' }, { ...result, razorpay_order_id: 'order_other' }]) {
      expect(() => razorpayResult(value, order.providerOrderId)).toThrow();
    }
  });
});

describe('native checkout lifecycle', () => {
  beforeEach(() => {
    jest.mocked(RazorpayCheckout.open).mockReset();
    NativeModules.RNRazorpayCheckout = { open: jest.fn() };
  });
  afterEach(() => { delete NativeModules.RNRazorpayCheckout; });
  const liveOrder = () => ({ ...order, expiresAt: new Date(Date.now() + 120_000).toISOString() });
  it('fails clearly on Expo Go and older installed binaries', async () => {
    delete NativeModules.RNRazorpayCheckout;
    await expect(openRazorpayCheckout(liveOrder())).rejects.toThrow('latest Gloceries app build');
    expect(RazorpayCheckout.open).not.toHaveBeenCalled();
    expect(isNativeCheckoutOpen()).toBe(false);
  });
  it('prevents overlapping native sessions and always releases the session guard', async () => {
    let finish!: (value: unknown) => void;
    jest.mocked(RazorpayCheckout.open).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const payment = openRazorpayCheckout(liveOrder());
    // Lazy import resolves before checkout becomes active.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(isNativeCheckoutOpen()).toBe(true);
    await expect(openRazorpayCheckout(liveOrder())).rejects.toThrow('already open');
    finish(result);
    await expect(payment).resolves.toEqual(result);
    expect(isNativeCheckoutOpen()).toBe(false);
  });
  it('does not expose arbitrary provider error payloads or claim success on cancellation', async () => {
    jest.mocked(RazorpayCheckout.open).mockRejectedValue({ reason: 'payment_cancelled', description: 'private provider payload' });
    await expect(openRazorpayCheckout(liveOrder())).rejects.toThrow('cancelled');
    expect(isNativeCheckoutOpen()).toBe(false);
  });
});
