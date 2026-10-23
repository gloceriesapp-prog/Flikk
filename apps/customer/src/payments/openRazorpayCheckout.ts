import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { NetbankingBank, RazorpayOrder, RazorpayPaymentResult } from '../api/payments';
import type { PaymentMethod } from './paymentMethod';
import { razorpayOptions, razorpayResult } from './razorpayOptions';

let checkoutOpen = false;
export const isNativeCheckoutOpen = () => checkoutOpen;

// Load lazily so Expo Go / an old installed binary can still browse and pay
// cash. Replacing a native gateway requires a NEW store/dev-client build.
export async function openRazorpayCheckout(order: RazorpayOrder, method: PaymentMethod = 'online', bank?: NetbankingBank, walletContact?: string): Promise<RazorpayPaymentResult> {
  if (checkoutOpen) throw new Error('A payment is already open. Finish checking it first.');
  const options = razorpayOptions(order, method, Date.now(), bank, walletContact);
  checkoutOpen = true;
  try {
    let sdk: typeof import('react-native-razorpay');
    try {
      const nativeCheckout = TurboModuleRegistry.get('RNRazorpayCheckout') ?? NativeModules.RNRazorpayCheckout;
      if (!nativeCheckout) throw new Error('Native gateway is not installed.');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sdk = require('react-native-razorpay') as typeof import('react-native-razorpay');
    } catch {
      throw new Error('Online payments need the latest Gloceries app build. Update the app or choose cash on delivery.');
    }
    const result: unknown = await sdk.default.open(options);
    return razorpayResult(result, order.providerOrderId);
  } catch (error) {
    // Even a cancelled/error callback can race a delayed capture. The caller
    // always reconciles the SAME saved order instead of initiating a new one.
    if (error instanceof Error) throw error;
    const reason = error && typeof error === 'object' && 'reason' in error ? error.reason : null;
    throw new Error(reason === 'payment_cancelled'
      ? 'Payment was cancelled. Your order is saved; check its status before paying again.'
      : 'Payment was not completed. Check your saved order before trying again.');
  } finally {
    checkoutOpen = false;
  }
}
