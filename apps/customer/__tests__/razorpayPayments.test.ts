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

it('configures secure checkout with the selected netbanking bank only', () => {
  expect(razorpayOptions(order, 'netbanking', now, { code: 'SBIN', name: 'State Bank of India' }).config?.display)
    .toMatchObject({ blocks: { selected_bank: { instruments: [{ method: 'netbanking', banks: ['SBIN'] }] } }, preferences: { show_default_blocks: false } });
  expect(() => razorpayOptions(order, 'netbanking', now, { code: 'not a code', name: 'Bad' })).toThrow();
  expect(() => razorpayOptions(order, 'card', now, { code: 'SBIN', name: 'State Bank of India' })).toThrow();
  expect(razorpayOptions(order, 'online', now).config).toBeUndefined();
});

it.each(['mobikwik', 'olamoney'] as const)('restricts wallet checkout to %s', code => {
  expect(razorpayOptions(order, `wallet:${code}`, now).config?.display)
    .toMatchObject({ blocks: { selected_wallet: { instruments: [{ method: 'wallet', wallets: [code] }] } }, preferences: { show_default_blocks: false } });
});
it('rejects unsupported wallets', () => {
  expect(() => razorpayOptions(order, 'wallet:payzapp' as never, now)).toThrow();
});


it('opens card-only Razorpay checkout with the server order even without a saved email', async () => {
  NativeModules.RNRazorpayCheckout = { open: jest.fn() };
  const currentOrder = { ...order, expiresAt: new Date(Date.now() + 120_000).toISOString() };
  jest.mocked(RazorpayCheckout.open).mockResolvedValueOnce(result);
  try {
    await expect(openRazorpayCheckout(currentOrder, 'card')).resolves.toEqual(result);
    expect(RazorpayCheckout.open).toHaveBeenLastCalledWith(expect.objectContaining({
      key: order.keyId, order_id: order.providerOrderId, amount: order.amountPaise,
      config: { display: { blocks: { cards_only: {
        name: 'Credit or debit card', instruments: [{ method: 'card' }],
      } }, sequence: ['block.cards_only'], preferences: { show_default_blocks: false } } },
    }));
    expect(isNativeCheckoutOpen()).toBe(false);
  } finally { delete NativeModules.RNRazorpayCheckout; }
});

it('passes the wallet number only as checkout contact without altering the server order', () => {
  const options = razorpayOptions(order, 'wallet:mobikwik', now, undefined, '+919000000000');
  expect(options.prefill.contact).toBe('+919000000000');
  expect(options.order_id).toBe(order.providerOrderId);
  expect(options.amount).toBe(order.amountPaise);
  expect(order.customer).toBeUndefined();
  expect(() => razorpayOptions(order, 'wallet:olamoney', now, undefined, '123')).toThrow('valid wallet mobile');
  expect(() => razorpayOptions(order, 'card', now, undefined, '+919000000000')).toThrow();
});
