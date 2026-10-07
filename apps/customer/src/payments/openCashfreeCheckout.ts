// Cashfree web checkout (react-native-cashfree-pg-sdk) for card, netbanking
// and every other method the hosted page offers. UPI apps and UPI ID use
// their own S2S flows (upiIntent.ts / UPI collect) and never come here.
//
// The SDK is imported lazily: its native module throws when required in a
// build that doesn't link it (plain Expo Go), and a top-level import would
// crash the whole app at launch instead of just this one action.
//
// onVerify only means the checkout UI finished — never that money moved.
// The caller must still POST /payments/verify (server re-fetches Cashfree).
import type { CashfreeOrder } from '../api/payments';

export function cashfreeEnvironment(fromServer: string | undefined): 'SANDBOX' | 'PRODUCTION' {
  // The server's value wins: it knows which credentials created the session.
  const env = fromServer ?? process.env.EXPO_PUBLIC_CASHFREE_ENV ?? 'sandbox';
  return env === 'production' ? 'PRODUCTION' : 'SANDBOX';
}

export async function openCashfreeCheckout(order: Pick<CashfreeOrder, 'paymentSessionId' | 'providerOrderId' | 'environment'>): Promise<void> {
  let sdk: typeof import('react-native-cashfree-pg-sdk');
  let contract: typeof import('cashfree-pg-api-contract');
  try {
    sdk = await import('react-native-cashfree-pg-sdk');
    contract = await import('cashfree-pg-api-contract');
  } catch {
    throw new Error('Card and netbanking checkout needs the latest app build. Please update the app or choose another method.');
  }
  const { CFPaymentGatewayService } = sdk;
  const env = cashfreeEnvironment(order.environment) === 'PRODUCTION' ? contract.CFEnvironment.PRODUCTION : contract.CFEnvironment.SANDBOX;
  return new Promise<void>((resolve, reject) => {
    CFPaymentGatewayService.setCallback({
      onVerify() {
        CFPaymentGatewayService.removeCallback();
        resolve();
      },
      onError(error) {
        CFPaymentGatewayService.removeCallback();
        const message = typeof error?.getMessage === 'function' ? error.getMessage() : '';
        reject(new Error(message || 'Payment was not completed.'));
      },
    });
    try {
      CFPaymentGatewayService.doWebPayment(new contract.CFSession(order.paymentSessionId, order.providerOrderId, env));
    } catch (err) {
      CFPaymentGatewayService.removeCallback();
      reject(err instanceof Error ? err : new Error('Could not open checkout.'));
    }
  });
}
