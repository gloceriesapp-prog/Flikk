import { NativeModules, Platform } from 'react-native';
import { openRazorpayCheckout } from '../src/payments/openRazorpayCheckout';
import { installedIosUpiApps, supportedIosUpiApps } from '../src/payments/iosUpiCheckout';
import StandardCheckout from 'react-native-razorpay';
import { fetchPaymentAvailability, fetchPaymentCustomer } from '../src/api/payments';

jest.mock('../src/api/payments', () => ({ fetchPaymentAvailability: jest.fn(), fetchPaymentCustomer: jest.fn() }));

const mockListeners = new Map<string, Set<(data: unknown) => void>>();
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => ({
  __esModule: true, default: class {
    addListener(name: string, callback: (data: unknown) => void) {
      const listeners = mockListeners.get(name) ?? new Set();
      listeners.add(callback); mockListeners.set(name, listeners);
      return { remove: () => listeners.delete(callback) };
    }
  },
}));
const emit = (name: string, value: unknown) => mockListeners.get(name)?.forEach(fn => fn(value));
const order = () => ({ provider: 'razorpay' as const, providerOrderId: 'order_live', keyId: 'rzp_live_public',
  amount: 63, amountPaise: 6300, currency: 'INR' as const, environment: 'production' as const,
  expiresAt: new Date(Date.now() + 60000).toISOString(), customer: { email: 'test@example.com', contact: '9000000000' } });
const evidence = { razorpay_order_id: 'order_live', razorpay_payment_id: 'pay_live', razorpay_signature: 'a'.repeat(64) };
const originalOS = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks(); mockListeners.clear();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: true, upi_intent: true, cod: true, min_order_value: 0 });
  jest.mocked(fetchPaymentCustomer).mockResolvedValue({ email: 'test@example.com', contact: '+919000000000' });
  NativeModules.RazorpayEventEmitterCustom = {};
  NativeModules.RazorpayCustomui = {
    getAppsWhichSupportUpi: jest.fn(() => emit('Razorpay::UPI_APPS', { data: [{ appName: 'google_pay' }, { appName: 'phonepe' }] })),
    open: jest.fn(() => emit('Razorpay::PAYMENT_SUCCESS', evidence)),
  };
});
afterEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  delete NativeModules.RazorpayCustomui; delete NativeModules.RazorpayEventEmitterCustom;
});
it('passes the SDK-selected app and exact server order to Custom UPI without Standard Checkout', async () => {
  await expect(openRazorpayCheckout(order(), 'upi_app:gpay')).resolves.toEqual(evidence);
  expect(NativeModules.RazorpayCustomui.open).toHaveBeenCalledWith(expect.objectContaining({
    method: 'upi', '_[flow]': 'intent', upi_app_package_name: 'google_pay',
    key_id: 'rzp_live_public', order_id: 'order_live', amount: 6300, currency: 'INR',
  }));
  expect(StandardCheckout.open).not.toHaveBeenCalled();
  expect([...mockListeners.values()].every(listeners => listeners.size === 0)).toBe(true);
});
it('does not replace an absent selected app with the Razorpay picker', async () => {
  await expect(openRazorpayCheckout(order(), 'upi_app:paytm')).rejects.toThrow('not available');
  expect(NativeModules.RazorpayCustomui.open).not.toHaveBeenCalled();
  expect(StandardCheckout.open).not.toHaveBeenCalled();
});
it('refuses sandbox keys and mismatched amounts before opening a UPI app', async () => {
  await expect(openRazorpayCheckout({ ...order(), environment: 'sandbox', keyId: 'rzp_test_public' }, 'upi_app:gpay')).rejects.toThrow('live payment');
  await expect(openRazorpayCheckout({ ...order(), amountPaise: 1 }, 'upi_app:gpay')).rejects.toThrow('verified');
  expect(NativeModules.RazorpayCustomui.open).not.toHaveBeenCalled();
});
it('does not claim success for a cancellation or a different provider order', async () => {
  NativeModules.RazorpayCustomui.open.mockImplementation(() => emit('Razorpay::PAYMENT_ERROR', {}));
  await expect(openRazorpayCheckout(order(), 'upi_app:phonepe')).rejects.toThrow('not completed');
  NativeModules.RazorpayCustomui.open.mockImplementation(() => emit('Razorpay::PAYMENT_SUCCESS', { ...evidence, razorpay_order_id: 'order_other' }));
  await expect(openRazorpayCheckout(order(), 'upi_app:gpay')).rejects.toThrow('needs checking');
});
it('refuses an old binary without silently opening Standard Checkout', async () => {
  delete NativeModules.RazorpayCustomui;
  await expect(openRazorpayCheckout(order(), 'upi_app:gpay')).rejects.toThrow('latest Gloceries');
  expect(StandardCheckout.open).not.toHaveBeenCalled();
});
it('honors the live server payment switch without opening either SDK', async () => {
  jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: true, upi_intent: false, cod: true, min_order_value: 0 });
  await expect(openRazorpayCheckout(order(), 'upi_app:gpay')).rejects.toThrow('not available');
  expect(NativeModules.RazorpayCustomui.open).not.toHaveBeenCalled();
  expect(StandardCheckout.open).not.toHaveBeenCalled();
});
it('uses only identifiers returned by the SDK, including current dictionary entries', () => {
  expect(supportedIosUpiApps({ data: [{ appName: { appName: 'Google Pay', shortcode: 'google_pay', uriScheme: 'tez://upi/pay' } }, { appName: 'unknown' }, { appName: 'phonepe' }] })
    .map(item => [item.app.id, item.sdkId])).toEqual([['gpay', 'google_pay'], ['phonepe', 'phonepe']]);
});
it('cleans up a timed-out discovery request', async () => {
  jest.useFakeTimers();
  NativeModules.RazorpayCustomui.getAppsWhichSupportUpi.mockImplementation(() => {});
  const result = expect(installedIosUpiApps()).rejects.toThrow('Could not check');
  await jest.advanceTimersByTimeAsync(8000); await result;
  expect([...mockListeners.values()].every(listeners => listeners.size === 0)).toBe(true);
  jest.useRealTimers();
});

it('uses the server account contact when the provider order contains no customer object', async () => {
  const withoutContact = { ...order(), customer: undefined };
  await expect(openRazorpayCheckout(withoutContact, 'upi_app:gpay')).resolves.toEqual(evidence);
  expect(NativeModules.RazorpayCustomui.open).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com', contact: '+919000000000' }));
});
