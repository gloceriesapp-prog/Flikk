import { NativeEventEmitter, NativeModules, Platform, type EmitterSubscription } from 'react-native';
import type { RazorpayOrder, RazorpayPaymentResult } from '../api/payments';
import { useAuthStore } from '../store/useAuthStore';
import { fetchPaymentAvailability, fetchPaymentCustomer } from '../api/payments';
import type { PaymentMethod } from './paymentMethod';
import { razorpayOptions, razorpayResult } from './razorpayOptions';
import { UPI_APPS, type UpiApp } from './upiApps';

interface CustomUpiNative {
  getAppsWhichSupportUpi(): void;
  open(options: Record<string, unknown>): void;
}

const appIds: Record<string, string> = {
  google_pay: 'gpay', gpay: 'gpay', phonepe: 'phonepe', paytm: 'paytm',
  bhim: 'bhim', cred: 'cred', credpay: 'cred', amazonpay: 'amazonpay', whatsapp: 'whatsapp',
};

export const usesIosUpiCheckout = (method: PaymentMethod) => Platform.OS === 'ios' && method.startsWith('upi_app:');

function nativeSdk() {
  const native = NativeModules.RazorpayCustomui as CustomUpiNative | undefined;
  const events = NativeModules.RazorpayEventEmitterCustom;
  if (!native?.open || !native.getAppsWhichSupportUpi || !events) {
    throw new Error('Direct UPI needs the latest Gloceries app. Update the app or choose another payment method.');
  }
  return { native, events: new NativeEventEmitter(events) };
}

// Keep the identifier returned by Razorpay, rather than constructing an iOS
// deep link or guessing an Android package name. Both historical string and
// current dictionary entries are wrapped as appName by the RN native bridge.
export function supportedIosUpiApps(value: unknown): { app: UpiApp; sdkId: string }[] {
  if (!value || typeof value !== 'object' || !('data' in value) || !Array.isArray(value.data)) return [];
  const result: { app: UpiApp; sdkId: string }[] = [];
  for (const entry of value.data) {
    const raw = entry && typeof entry === 'object' ? entry.appName : undefined;
    const sdkId = typeof raw === 'string' ? raw
      : raw && typeof raw === 'object' && typeof raw.appPackageName === 'string' ? raw.appPackageName
        : raw && typeof raw === 'object' && typeof raw.shortcode === 'string' ? raw.shortcode
          : undefined;
    if (!sdkId) continue;
    const app = UPI_APPS.find(candidate => candidate.id === appIds[sdkId]);
    if (app && !result.some(item => item.app.id === app.id)) result.push({ app, sdkId });
  }
  return result;
}

export async function installedIosUpiApps(): Promise<{ app: UpiApp; sdkId: string }[]> {
  const { native, events } = nativeSdk();
  return new Promise((resolve, reject) => {
    let subscription: EmitterSubscription | undefined;
    const timer = setTimeout(() => { subscription?.remove(); reject(new Error('Could not check UPI apps. Please try again.')); }, 8_000);
    subscription = events.addListener('Razorpay::UPI_APPS', data => {
      clearTimeout(timer); subscription?.remove(); resolve(supportedIosUpiApps(data));
    });
    try { native.getAppsWhichSupportUpi(); } catch (error) {
      clearTimeout(timer); subscription.remove(); reject(error);
    }
  });
}

export async function assertIosUpiConfigured(method: PaymentMethod): Promise<string> {
  if (!usesIosUpiCheckout(method)) throw new Error('Choose a supported UPI app.');
  const availability = await fetchPaymentAvailability();
  if (!availability.online || availability.upi_intent !== true) {
    throw new Error('UPI app payments are not available. Choose another payment method.');
  }
  const selected = (await installedIosUpiApps()).find(item => `upi_app:${item.app.id}` === method);
  if (!selected) throw new Error('This UPI app is not available for this payment. Choose another payment method.');
  return selected.sdkId;
}

export async function openIosUpiCheckout(order: RazorpayOrder, method: PaymentMethod): Promise<RazorpayPaymentResult> {
  // Shared validation checks the server order, paise amount, expiry and key
  // environment. Intent itself is live-only; never substitute a sandbox key.
  const epoch = useAuthStore.getState().sessionEpoch;
  razorpayOptions(order, method);
  if (order.environment !== 'production' || !order.keyId.startsWith('rzp_live_')) {
    throw new Error('UPI app payments require the live payment service. Choose another payment method.');
  }
  const sdkId = await assertIosUpiConfigured(method);
  razorpayOptions(order, method); // Discovery may have waited past the order expiry.
  const customer = await fetchPaymentCustomer();
  if (useAuthStore.getState().sessionEpoch !== epoch) throw new Error('Your account changed. Please check your checkout again.');
  razorpayOptions(order, method);
  if (!customer.email || !/^(?:\+91)?[6-9]\d{9}$/.test(customer.contact)) throw new Error('Add your payment receipt email before paying with UPI.');
  const { native, events } = nativeSdk();
  return new Promise((resolve, reject) => {
    const subscriptions: EmitterSubscription[] = [];
    const clean = () => subscriptions.forEach(subscription => subscription.remove());
    subscriptions.push(events.addListener('Razorpay::PAYMENT_SUCCESS', data => {
      clean();
      try { resolve(razorpayResult(data, order.providerOrderId)); } catch (error) { reject(error); }
    }));
    subscriptions.push(events.addListener('Razorpay::PAYMENT_ERROR', () => {
      clean(); reject(new Error('Payment was not completed. Check your saved order before trying again.'));
    }));
    try {
      // Use the native Custom SDK directly. Its JS wrapper logs the entire
      // payment payload and removes unrelated event subscriptions on completion.
      native.open({
        key_id: order.keyId, order_id: order.providerOrderId,
        amount: order.amountPaise, currency: order.currency,
        email: customer.email, contact: customer.contact,
        description: 'Groceries and essentials', method: 'upi',
        '_[flow]': 'intent', upi_app_package_name: sdkId,
        timeout: Math.max(1, Math.floor((Date.parse(order.expiresAt) - Date.now()) / 1000)),
      });
    } catch (error) { clean(); reject(error); }
  });
}
