import { NativeModules, Platform } from 'react-native';
import { createUpiIntentSession, fetchPaymentAvailability, type RazorpayUpiIntent } from '../src/api/payments';
import { assertDirectUpiConfigured, launchUpiIntent, prepareUpiIntent, validateUpiIntent } from '../src/payments/upiIntent';
jest.mock('../src/api/payments', () => ({ createUpiIntentSession: jest.fn(), fetchPaymentAvailability: jest.fn() }));
const session = (): RazorpayUpiIntent => ({ provider: 'razorpay', providerOrderId: 'order_abc', providerPaymentId: 'pay_abc', amountPaise: 6300, currency: 'INR', expiresAt: new Date(Date.now() + 60000).toISOString(), intentUrl: 'upi://pay?pa=merchant%40bank&pn=Gloceries&tr=reference&am=63.00&cu=INR' });
describe('server-created direct UPI intent', () => {
  const originalPlatform = Platform.OS;
  const originalModule = NativeModules.UpiApps;
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    NativeModules.UpiApps = { launchPaymentIntent: jest.fn().mockResolvedValue(undefined) };
    jest.mocked(createUpiIntentSession).mockReset();
    jest.mocked(fetchPaymentAvailability).mockReset().mockResolvedValue({ online: true, cod: true, min_order_value: 0, upi_intent: true });
  });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    if (originalModule) NativeModules.UpiApps = originalModule; else delete NativeModules.UpiApps;
  });
  it('opens unchanged provider URI in selected app without checkout SDK', async () => {
    const value = session(); await launchUpiIntent(value, 'upi_app:phonepe');
    expect(NativeModules.UpiApps.launchPaymentIntent).toHaveBeenCalledWith(value.intentUrl, 'com.phonepe.app');
  });
  it('rejects old binary before creating a provider payment', async () => {
    NativeModules.UpiApps = {};
    await expect(prepareUpiIntent({ orderId: 'owned-order' }, 'upi_app:gpay')).rejects.toThrow('latest');
    expect(createUpiIntentSession).not.toHaveBeenCalled();
  });
  it('opens the exact provider URI in Google Pay without rewriting payee or encoded fields', async () => {
    const value = { ...session(), intentUrl: `${session().intentUrl}&tn=Groceries%20%26%20essentials&sign=abc%2Bdef%3D` };
    await launchUpiIntent(value, 'upi_app:gpay');
    expect(NativeModules.UpiApps.launchPaymentIntent).toHaveBeenCalledWith(value.intentUrl, 'com.google.android.apps.nbu.paisa.user');
  });
  it('blocks test-mode UPI before creating a payment or launching an app', async () => {
    jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: true, cod: true, min_order_value: 0, upi_intent: false });
    await expect(assertDirectUpiConfigured('upi_app:gpay')).rejects.toThrow('unavailable on this server');
    await expect(prepareUpiIntent({ orderId: 'owned-order' }, 'upi_app:gpay')).rejects.toThrow('unavailable on this server');
    expect(createUpiIntentSession).not.toHaveBeenCalled();
    expect(NativeModules.UpiApps.launchPaymentIntent).not.toHaveBeenCalled();
  });
  it.each(['pa=another%40bank', 'tr=other'])('rejects duplicated destination parameter %s', duplicate => {
    expect(() => validateUpiIntent({ ...session(), intentUrl: `${session().intentUrl}&${duplicate}` })).toThrow();
  });
  it.each(['\n', '\t', '\u0000', '\u007f'])('rejects raw control characters before URL parsing', control => {
    expect(() => validateUpiIntent({ ...session(), intentUrl: `${control}${session().intentUrl}` })).toThrow();
  });
  it('prepares only from server session', async () => {
    const value = session(); jest.mocked(createUpiIntentSession).mockResolvedValue(value);
    await expect(prepareUpiIntent({ orderId: 'owned-order' }, 'upi_app:gpay')).resolves.toEqual(value);
  });
  it.each(['https://merchant.test/pay?am=63&cu=INR', 'upi://pay?pa=x&tr=y&am=1&cu=INR', 'upi://pay?pa=x&tr=y&am=63&am=1&cu=INR', 'upi://pay?pa=x&tr=y&am=63&cu=USD', 'upi://pay?pa=x&tr=y&am=63&cu=INR#unsafe'])('rejects mismatched payload %s', intentUrl => {
    expect(() => validateUpiIntent({ ...session(), intentUrl })).toThrow();
  });
  it('rejects expired payment and unknown app', async () => {
    await expect(launchUpiIntent({ ...session(), expiresAt: new Date(Date.now() - 1).toISOString() }, 'upi_app:gpay')).rejects.toThrow();
    await expect(launchUpiIntent(session(), 'upi_app:unknown')).rejects.toThrow();
  });
  it('does not substitute hosted checkout on unsupported platforms', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    await expect(prepareUpiIntent({ orderId: 'owned-order' }, 'upi_app:gpay')).rejects.toThrow('Android');
    expect(createUpiIntentSession).not.toHaveBeenCalled();
  });
});
