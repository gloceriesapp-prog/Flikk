import { NativeModules, Platform } from 'react-native';
import type { CashfreeOrder } from '../api/payments';
import type { PaymentMethod } from './paymentMethod';

// True only in a binary that ships Cashfree's native module. An OTA update
// on an older binary must keep asking the server for Razorpay.
export const hasCashfreeSdk = () => Boolean(NativeModules.CashfreePgApi);

export function checkCashfreeOrder(order: CashfreeOrder, nowMs = Date.now()) {
  const expires = Date.parse(order.expiresAt);
  if (order.provider !== 'cashfree' || !/^gl_[0-9a-f]{32}$/.test(order.providerOrderId)
    || typeof order.paymentSessionId !== 'string' || order.paymentSessionId.length < 10 || order.currency !== 'INR'
    || !Number.isSafeInteger(order.amountPaise) || order.amountPaise <= 0 || Math.round(order.amount * 100) !== order.amountPaise
    || (order.environment !== 'sandbox' && order.environment !== 'production')) {
    throw new Error('Payment details could not be verified. Check your saved order before paying.');
  }
  if (!Number.isFinite(expires) || expires <= nowMs) throw new Error('This checkout has expired. Review your saved order.');
}

let checkoutOpen = false;
// Resolves when Cashfree's UI finishes; that is NOT proof of payment. The
// caller always asks the server (verifyPayment), which reads Cashfree itself.
export async function openCashfreeCheckout(order: CashfreeOrder, method: PaymentMethod = 'online'): Promise<void> {
  if (checkoutOpen) throw new Error('A payment is already open. Finish checking it first.');
  checkCashfreeOrder(order);
  let sdk: typeof import('react-native-cashfree-pg-sdk');
  let contract: typeof import('cashfree-pg-api-contract');
  try {
    if (!hasCashfreeSdk()) throw new Error('Native gateway is not installed.');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sdk = require('react-native-cashfree-pg-sdk') as typeof import('react-native-cashfree-pg-sdk');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    contract = require('cashfree-pg-api-contract') as typeof import('cashfree-pg-api-contract');
  } catch {
    throw new Error('Online payments need the latest Gloceries app build. Update the app or choose cash on delivery.');
  }
  checkoutOpen = true;
  const gateway = sdk.CFPaymentGatewayService;
  try {
    await new Promise<void>((resolve, reject) => {
      gateway.setCallback({
        onVerify: (orderId: string) => orderId === order.providerOrderId ? resolve()
          : reject(new Error('The payment result needs checking. Open your saved order to confirm its status.')),
        // A cancelled/failed callback can still race a late success: the
        // caller reconciles the SAME saved order instead of starting another.
        onError: (error) => reject(new Error(/cancel/i.test(error?.getCode?.() ?? '') || /cancel/i.test(error?.getMessage?.() ?? '')
          ? 'Payment was cancelled, so the order isn’t placed yet. Check its status before paying again.'
          : 'Payment was not completed. Check your saved order before trying again.')),
      });
      const session = new contract.CFSession(order.paymentSessionId, order.providerOrderId,
        order.environment === 'production' ? contract.CFEnvironment.PRODUCTION : contract.CFEnvironment.SANDBOX);
      // A chosen UPI app opens Cashfree's native UPI intent sheet on Android;
      // everything else (cards, netbanking, iOS UPI) uses Cashfree's checkout.
      if (method.startsWith('upi_app:') && Platform.OS === 'android') gateway.doUPIPayment(new contract.CFUPIIntentCheckoutPayment(session, null));
      else gateway.doWebPayment(session);
    });
  } finally {
    gateway.removeCallback();
    checkoutOpen = false;
  }
}
