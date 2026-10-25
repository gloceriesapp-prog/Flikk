import { NativeModules, Platform } from 'react-native';
import { createUpiIntentSession, fetchPaymentAvailability, type PaymentTarget, type RazorpayUpiIntent } from '../api/payments';
import type { PaymentMethod } from './paymentMethod';
import { UPI_APPS } from './upiApps';

interface IntentModule { launchPaymentIntent(uri: string, packageName: string): Promise<void> }

// iOS uses Razorpay's native checkout picker. Only Android supports our
// package-targeted launcher and resumable server-created intent sessions.
export function usesDirectUpiIntent(method: PaymentMethod): boolean {
  return Platform.OS === 'android' && method.startsWith('upi_app:');
}


export const DIRECT_UPI_UNAVAILABLE = 'UPI app payments are unavailable on this server. Choose another payment method or contact support.';

// Recheck at the action boundary, before creating an order or a provider attempt.
// A cached UI flag alone cannot guarantee that the backend configuration matches.
export async function assertDirectUpiConfigured(method: PaymentMethod): Promise<void> {
  assertDirectUpiAvailable(method);
  const availability = await fetchPaymentAvailability();
  if (!availability.online || availability.upi_intent !== true) throw new Error(DIRECT_UPI_UNAVAILABLE);
}

function selectedApp(method: PaymentMethod) {
  const app = UPI_APPS.find(candidate => method === `upi_app:${candidate.id}`);
  if (!app) throw new Error('Choose an installed UPI app.');
  return app;
}

function nativeLauncher(): IntentModule {
  if (Platform.OS !== 'android') throw new Error('Direct UPI app payments are currently available on Android. Choose another payment method.');
  const module = NativeModules.UpiApps as Partial<IntentModule> | undefined;
  if (typeof module?.launchPaymentIntent !== 'function') {
    throw new Error('Direct UPI payments need the latest Gloceries app build. Update the app or choose another payment method.');
  }
  return module as IntentModule;
}

export function validateUpiIntent(session: RazorpayUpiIntent, now = Date.now()): void {
  if (session.provider !== 'razorpay' || !/^order_[a-zA-Z0-9]+$/.test(session.providerOrderId)
    || !/^pay_[a-zA-Z0-9]+$/.test(session.providerPaymentId)
    || session.currency !== 'INR' || !Number.isSafeInteger(session.amountPaise) || session.amountPaise <= 0
    || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= now) {
    throw new Error('This UPI payment needs checking. Review your payment before trying again.');
  }
  if (/\s/.test(session.intentUrl) || [...session.intentUrl].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
    throw new Error('The UPI payment link is invalid.');
  }
  let uri: URL;
  try { uri = new URL(session.intentUrl); } catch { throw new Error('The UPI payment link is invalid.'); }
  const amounts = uri.searchParams.getAll('am');
  if (uri.protocol !== 'upi:' || uri.hostname !== 'pay' || uri.username || uri.password || uri.port || uri.hash
    || (uri.pathname !== '' && uri.pathname !== '/') || session.intentUrl.length > 8192
    || amounts.length !== 1 || !/^\d+(\.\d{1,2})?$/.test(amounts[0])
    || Math.round(Number(amounts[0]) * 100) !== session.amountPaise
    || uri.searchParams.getAll('cu').length !== 1 || uri.searchParams.get('cu') !== 'INR'
    || uri.searchParams.getAll('pa').length !== 1 || uri.searchParams.getAll('tr').length !== 1
    || !uri.searchParams.get('pa')?.trim() || !uri.searchParams.get('tr')?.trim()) {
    throw new Error('The UPI payment link does not match your order.');
  }
}

export async function prepareUpiIntent(target: PaymentTarget, method: PaymentMethod): Promise<RazorpayUpiIntent> {
  await assertDirectUpiConfigured(method);
  const session = await createUpiIntentSession(target);
  validateUpiIntent(session);
  return session;
}

export function assertDirectUpiAvailable(method: PaymentMethod): void {
  selectedApp(method);
  nativeLauncher();
}

export async function launchUpiIntent(session: RazorpayUpiIntent, method: PaymentMethod): Promise<void> {
  validateUpiIntent(session);
  const app = selectedApp(method);
  // The URI remains byte-for-byte provider generated. An activity result is
  // never a payment result; only backend reconciliation confirms capture.
  await nativeLauncher().launchPaymentIntent(session.intentUrl, app.androidPackage);
}
