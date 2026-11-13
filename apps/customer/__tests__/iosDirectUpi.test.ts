import { NativeModules, Platform } from 'react-native';
import { openRazorpayCheckout } from '../src/payments/openRazorpayCheckout';
import { assertIosUpiConfigured, installedIosUpiApps, supportedIosUpiApps } from '../src/payments/iosUpiCheckout';
import { requiresUpiReceiptEmail } from '../src/payments/upiReceiptRequirement';
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
    getAppsWhichSupportUpi: jest.fn(() => emit('Razorpay::UPI_APPS', { data: [
      { appName: { appName: 'Google Pay', appPackageName: 'google_pay', appLogo: 'https://cdn.razorpay.com/app/google_pay.png', appIconBase64: '' } },
      { appName: { appName: 'PhonePe', appPackageName: 'phonepe', appLogo: 'https://cdn.razorpay.com/app/phonepe.png', appIconBase64: '' } },
    ] })),
    dismissGloceriesUpi: jest.fn(),
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
it('parses the appPackageName response observed from the installed iOS Custom SDK', () => {
  expect(supportedIosUpiApps({ data: [
    { appName: { appName: 'Google Pay', appPackageName: 'google_pay', appIconBase64: '' } },
    { appName: { appName: 'PhonePe', appPackageName: 'phonepe', appIconBase64: '' } },
    { appName: { appName: 'AmazonPay', appPackageName: 'amazonpay', appIconBase64: '' } },
    { appName: { appName: 'Unsupported', appPackageName: 'unknown' } },
  ] }).map(item => [item.app.id, item.sdkId])).toEqual([
    ['gpay', 'google_pay'], ['phonepe', 'phonepe'], ['amazonpay', 'amazonpay'],
  ]);
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

it('opens the selected iOS UPI app without an email field when the server allows omission', async () => {
  jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: true, upi_intent: true, upi_email_optional: true, cod: true, min_order_value: 0 });
  jest.mocked(fetchPaymentCustomer).mockResolvedValue({ email: null, contact: '+919000000000' });
  expect(await requiresUpiReceiptEmail('upi_app:gpay')).toBe(false);
  await expect(openRazorpayCheckout({ ...order(), customer: undefined }, 'upi_app:gpay')).resolves.toEqual(evidence);
  expect(fetchPaymentCustomer).toHaveBeenCalledWith({ includeEmail: false });
  const payload = NativeModules.RazorpayCustomui.open.mock.calls[0][0];
  expect(payload).not.toHaveProperty('email');
  expect(payload).toMatchObject({ contact: '+919000000000', upi_app_package_name: 'google_pay', '_[flow]': 'intent' });
  expect(StandardCheckout.open).not.toHaveBeenCalled();
});
it('does not forward a saved email when email omission is enabled', async () => {
  jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: true, upi_intent: true, upi_email_optional: true, cod: true, min_order_value: 0 });
  await openRazorpayCheckout(order(), 'upi_app:phonepe');
  expect(NativeModules.RazorpayCustomui.open.mock.calls[0][0]).not.toHaveProperty('email');
});
it.each([undefined, false])('retains the merchant contact requirement when optional email is %s', async flag => {
  jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: true, upi_intent: true, upi_email_optional: flag, cod: true, min_order_value: 0 });
  jest.mocked(fetchPaymentCustomer).mockResolvedValue({ email: null, contact: '+919000000000' });
  expect(await requiresUpiReceiptEmail('upi_app:gpay')).toBe(true);
  await expect(openRazorpayCheckout(order(), 'upi_app:gpay')).rejects.toThrow('receipt email');
  expect(NativeModules.RazorpayCustomui.open).not.toHaveBeenCalled();
});
it('still rejects an invalid phone number when email is optional', async () => {
  jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: true, upi_intent: true, upi_email_optional: true, cod: true, min_order_value: 0 });
  jest.mocked(fetchPaymentCustomer).mockResolvedValue({ email: null, contact: 'invalid' });
  await expect(openRazorpayCheckout(order(), 'upi_app:gpay')).rejects.toThrow('valid mobile number');
  expect(NativeModules.RazorpayCustomui.open).not.toHaveBeenCalled();
});
it('does not let optional-email capability bypass the selected-app or gateway checks', async () => {
  jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: false, upi_intent: true, upi_email_optional: true, cod: true, min_order_value: 0 });
  await expect(assertIosUpiConfigured('upi_app:gpay')).rejects.toThrow('not available');
  expect(NativeModules.RazorpayCustomui.open).not.toHaveBeenCalled();
});
it('cleans up cancellation listeners for an email-free iOS checkout', async () => {
  jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: true, upi_intent: true, upi_email_optional: true, cod: true, min_order_value: 0 });
  jest.mocked(fetchPaymentCustomer).mockResolvedValue({ email: null, contact: '+919000000000' });
  NativeModules.RazorpayCustomui.open.mockImplementation(() => emit('Razorpay::PAYMENT_ERROR', {}));
  await expect(openRazorpayCheckout(order(), 'upi_app:gpay')).rejects.toThrow('not completed');
  expect([...mockListeners.values()].every(listeners => listeners.size === 0)).toBe(true);
});

it('cleans up the native attempt when its processing screen is closed', async () => {
  NativeModules.RazorpayCustomui.open.mockImplementation(() => {});
  const controller = new AbortController();
  const pending = openRazorpayCheckout(order(), 'upi_app:gpay', undefined, undefined, controller.signal);
  const checked = expect(pending).rejects.toThrow('Payment check closed');
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await checked;
  expect(NativeModules.RazorpayCustomui.dismissGloceriesUpi).toHaveBeenCalled();
  expect([...mockListeners.values()].every(listeners => listeners.size === 0)).toBe(true);
});
