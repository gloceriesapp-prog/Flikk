import { Linking, Platform } from 'react-native';
import { detectInstalledUpiApps, matchNativeUpiApps, upiLaunchPlan } from '../src/payments/upiIntent';
import { UPI_APPS } from '../src/payments/upiApps';
import { canPayWithVpa, initialVpaState, isVpaFormatValid, vpaReducer, type VpaState } from '../src/payments/vpa';
import { availablePaymentMethod } from '../src/payments/paymentMethod';
import { orderUpiApps } from '../src/screens/payment-method/components/PaymentMethodList';
import { cashfreeEnvironment } from '../src/payments/openCashfreeCheckout';

jest.mock('expo-intent-launcher', () => ({ startActivityAsync: jest.fn() }));

const app = (id: string) => UPI_APPS.find((a) => a.id === id)!;

describe('installed UPI app detection', () => {
  it('keeps only known payment apps from the Android PackageManager result', () => {
    const detected = matchNativeUpiApps([
      { name: 'PhonePe', packageName: 'com.phonepe.app', className: 'com.phonepe.Main', icon: 'AAA' },
      { name: 'Phone case shop', packageName: 'com.example.cases', className: 'x.Main', icon: 'BBB' },
      { name: 'GPay', packageName: 'com.google.android.apps.nbu.paisa.user', className: 'g.Main', icon: 'CCC' },
    ]);
    expect(detected.map((a) => a.id)).toEqual(['gpay', 'phonepe']);
    expect(detected[1]).toMatchObject({ androidClassName: 'com.phonepe.Main', iconUri: 'data:image/png;base64,AAA' });
  });

  it('on iOS lists only apps whose scheme can open', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const spy = jest.spyOn(Linking, 'canOpenURL').mockImplementation(async (url) => url === 'tez://' || url === 'credpay://');
    try {
      expect((await detectInstalledUpiApps()).map((a) => a.id)).toEqual(['gpay', 'cred']);
    } finally {
      spy.mockRestore();
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
    }
  });

  it('puts the last-used app first', () => {
    expect(orderUpiApps([app('gpay'), app('phonepe'), app('paytm')], 'upi_app:paytm').map((a) => a.id)).toEqual(['paytm', 'gpay', 'phonepe']);
    expect(orderUpiApps([app('gpay'), app('phonepe')], 'cod').map((a) => a.id)).toEqual(['gpay', 'phonepe']);
  });
});

describe('UPI intent link selection', () => {
  const links = { default: 'upi://pay?pa=m@cf&am=10.00&tr=1', phonepe: 'phonepe://pay?pa=m@cf&am=10.00&tr=1' };

  it('iOS: Cashfree per-app link, then scheme-swapped default, then default', () => {
    expect(upiLaunchPlan(app('phonepe'), links, 'ios').map((s) => s.url)).toEqual([
      'phonepe://pay?pa=m@cf&am=10.00&tr=1', 'upi://pay?pa=m@cf&am=10.00&tr=1',
    ]);
    expect(upiLaunchPlan(app('gpay'), links, 'ios').map((s) => s.url)).toEqual([
      'tez://upi/pay?pa=m@cf&am=10.00&tr=1', 'upi://pay?pa=m@cf&am=10.00&tr=1',
    ]);
  });

  it('Android: explicit package intent when the activity is known, then default link', () => {
    const detected = { ...app('gpay'), androidClassName: 'g.Main' };
    expect(upiLaunchPlan(detected, links, 'android')).toEqual([
      { kind: 'android-intent', url: links.default }, { kind: 'url', url: links.default },
    ]);
    expect(upiLaunchPlan(app('gpay'), links, 'android')).toEqual([{ kind: 'url', url: links.default }]);
  });
});

describe('UPI ID verification state machine', () => {
  it('checks format locally', () => {
    expect(isVpaFormatValid('ravi@okaxis')).toBe(true);
    expect(isVpaFormatValid(' Ravi.K-1@ybl ')).toBe(true);
    for (const bad of ['', 'ravi', 'ravi@', '@okaxis', 'r@1bank', 'ravi@ok axis']) expect(isVpaFormatValid(bad)).toBe(false);
  });

  it('only a server-verified ID can pay, and editing revokes it', () => {
    let s: VpaState = initialVpaState();
    s = vpaReducer(s, { type: 'edit', vpa: 'Ravi@OKAXIS' });
    expect(canPayWithVpa(s)).toBe(false);
    s = vpaReducer(s, { type: 'verify' });
    expect(s).toEqual({ status: 'verifying', vpa: 'ravi@okaxis' });
    s = vpaReducer(s, { type: 'result', vpa: 'ravi@okaxis', valid: true, name: 'RAVI KUMAR' });
    expect(canPayWithVpa(s) && s.name).toBe('RAVI KUMAR');
    s = vpaReducer(s, { type: 'edit', vpa: 'ravi@okaxis2' });
    expect(canPayWithVpa(s)).toBe(false);
  });

  it('rejects bad format without a server call, and maps invalid/error results', () => {
    expect(vpaReducer(initialVpaState('nope'), { type: 'verify' }).status).toBe('invalid');
    const verifying = vpaReducer(initialVpaState('ab@ybl'), { type: 'verify' });
    expect(vpaReducer(verifying, { type: 'result', vpa: 'ab@ybl', valid: false, name: null }).status).toBe('invalid');
    expect(vpaReducer(verifying, { type: 'error', vpa: 'ab@ybl', message: 'Too many tries' })).toEqual({ status: 'invalid', vpa: 'ab@ybl', error: 'Too many tries' });
  });

  it('ignores a late result for an ID the customer already changed', () => {
    const verifying = vpaReducer(initialVpaState('ab@ybl'), { type: 'verify' });
    const edited = vpaReducer(verifying, { type: 'edit', vpa: 'bc@ybl' });
    expect(vpaReducer(edited, { type: 'result', vpa: 'ab@ybl', valid: true, name: 'A' })).toEqual(edited);
  });

  it("'upi_id' is only selectable with a verified ID in hand", () => {
    expect(availablePaymentMethod('upi_id', [], false)).toBeNull();
    expect(availablePaymentMethod('upi_id', [], true)).toBe('upi_id');
  });

  it('drops a method admin has switched off', () => {
    const codOnly = { cod: true, online: false };
    expect(availablePaymentMethod('cod', [], false, true, codOnly)).toBe('cod');
    expect(availablePaymentMethod('card', [], false, true, codOnly)).toBeNull();
    expect(availablePaymentMethod('upi_id', [], true, true, codOnly)).toBeNull();
    expect(availablePaymentMethod('upi_app:gpay', [app('gpay')], false, true, codOnly)).toBeNull();
    expect(availablePaymentMethod('cod', [], false, true, { cod: false, online: true })).toBeNull();
    expect(availablePaymentMethod('netbanking', [], false, true, { cod: false, online: true })).toBe('netbanking');
  });
});

describe('Cashfree environment', () => {
  it('prefers the server value and defaults to sandbox', () => {
    expect(cashfreeEnvironment('production')).toBe('PRODUCTION');
    expect(cashfreeEnvironment('sandbox')).toBe('SANDBOX');
  });
});
