// The provider contract every gateway implements. Money rules (claims,
// settlement, refund jobs) stay in SQL and the shared modules; a provider
// only creates its order, reads truth back, checks webhook signatures and
// moves refunds. Razorpay's existing modules satisfy it unchanged
// (recovery.ts / webhook.ts / refundPayment.ts); Cashfree lives in
// cashfreeClient.ts + cashfreeCheckout.ts.
import type { ReconciledPayment, Target } from './recovery.js';
import type { ProviderRefund } from './refundPayment.js';

export type PaymentProviderName = 'razorpay' | 'cashfree';
export const PAYMENT_PROVIDERS: readonly PaymentProviderName[] = ['razorpay', 'cashfree'];
export const isPaymentProvider = (value: unknown): value is PaymentProviderName =>
  typeof value === 'string' && (PAYMENT_PROVIDERS as readonly string[]).includes(value);

export interface PaymentProvider {
  name: PaymentProviderName;
  // Create (or recover) the one provider order for this checkout.
  createOrder(target: Target, total: number, claimed: boolean, customerId: string): Promise<{ id: string; amount: number }>;
  // Server read of the provider; settles a verified capture as a side effect.
  getPaymentStatus(target: Target, providerOrderId: string, total: number, openIsPending?: boolean): Promise<ReconciledPayment>;
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean;
  refund(source: { paymentId: string; providerOrderId: string }, requestKey: string, amountPaise: number, note: string): Promise<ProviderRefund>;
  refundStatus(source: { paymentId: string; providerOrderId: string }): Promise<ProviderRefund[]>;
}
