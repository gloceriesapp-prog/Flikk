import { Linking, NativeModules, Platform } from 'react-native';
import { detectInstalledUpiApps, matchNativeUpiApps } from '../src/payments/installedUpiApps';
import { UPI_APPS } from '../src/payments/upiApps';
import { availablePaymentMethod } from '../src/payments/paymentMethod';
import { orderUpiApps } from '../src/screens/payment-method/components/PaymentMethodList';


const app = (id: string) => UPI_APPS.find((a) => a.id === id)!;

describe('installed UPI app detection', () => {
  it('keeps only known payment apps from the Android PackageManager result', () => {
    const detected = matchNativeUpiApps([
      { name: 'PhonePe', packageName: 'com.phonepe.app', className: 'com.phonepe.Main', icon: 'AAA' },
      { name: 'Phone case shop', packageName: 'com.example.cases', className: 'x.Main', icon: 'BBB' },
      { name: 'GPay', packageName: 'com.google.android.apps.nbu.paisa.user', className: 'g.Main', icon: 'CCC' },
    ]);
    expect(detected.map((a) => a.id)).toEqual(['gpay', 'phonepe']);
    expect(detected[1]).toMatchObject({ iconUri: 'data:image/png;base64,AAA' });
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

  it('falls back to scheme discovery when Android native discovery fails', async () => {
    const original = Platform.OS;
    const previousModule = NativeModules.UpiApps;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    NativeModules.UpiApps = { getInstalledUpiApps: jest.fn().mockRejectedValue(new Error('PackageManager unavailable')) };
    const spy = jest.spyOn(Linking, 'canOpenURL').mockImplementation(async (url) => url === 'phonepe://');
    try {
      expect((await detectInstalledUpiApps()).map((a) => a.id)).toEqual(['phonepe']);
    } finally {
      spy.mockRestore();
      if (previousModule) NativeModules.UpiApps = previousModule;
      else delete NativeModules.UpiApps;
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
    }
  });

  it('does not replace an authoritative empty Android result with generic schemes', async () => {
    const original = Platform.OS;
    const previousModule = NativeModules.UpiApps;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    NativeModules.UpiApps = { getInstalledUpiApps: jest.fn().mockResolvedValue([]) };
    const spy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    try {
      expect(await detectInstalledUpiApps()).toEqual([]);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      if (previousModule) NativeModules.UpiApps = previousModule;
      else delete NativeModules.UpiApps;
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
    }
  });

  it('puts the last-used app first', () => {
    expect(orderUpiApps([app('gpay'), app('phonepe'), app('paytm')], 'upi_app:paytm').map((a) => a.id)).toEqual(['paytm', 'gpay', 'phonepe']);
    expect(orderUpiApps([app('gpay'), app('phonepe')], 'cod').map((a) => a.id)).toEqual(['gpay', 'phonepe']);
  });
});

describe('payment preference eligibility', () => {
  it('rejects unknown, uninstalled and legacy UPI collect preferences', () => {
    expect(availablePaymentMethod('upi_id', [])).toBeNull();
    expect(availablePaymentMethod('upi_app:phonepe', [app('gpay')])).toBeNull();
    expect(availablePaymentMethod('upi_app:gpay', [app('gpay')])).toBe('upi_app:gpay');
  });
  it('respects admin method switches', () => {
    const codOnly = { cod: true, online: false };
    expect(availablePaymentMethod('cod', [], codOnly)).toBe('cod');
    for (const method of ['card', 'online', 'netbanking', 'upi_app:gpay']) {
      expect(availablePaymentMethod(method, [app('gpay')], codOnly)).toBeNull();
    }
    expect(availablePaymentMethod('cod', [], { cod: false, online: true })).toBeNull();
  });
  it('declares every discovery scheme in iOS native config', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const schemes: string[] = require('../app.config.js').expo.ios.infoPlist.LSApplicationQueriesSchemes;
    for (const paymentApp of UPI_APPS) expect(schemes).toContain(paymentApp.scheme);
  });
});
