// Customer payment endpoints. Provider credentials and final settlement stay
// on the server; a native checkout callback is only evidence to verify.

import { apiRequest } from './client';
import type { PaymentMethod } from '../payments/paymentMethod';

// Public. Which methods a new checkout may use (admin Checkout settings with
// the server's env as hard kill) and the platform minimum order value (item
// subtotal, rupees). The server enforces both; this only shapes the UI.
export interface PaymentAvailability {
  online: boolean;
  cod: boolean;
  min_order_value: number;
}
export function fetchPaymentAvailability(): Promise<PaymentAvailability> {
  return apiRequest('/payments/availability');
}

export function fetchPaymentPreference(): Promise<{ method: PaymentMethod | null }> {
  return apiRequest('/payments/preference');
}

// Best effort after COD placement or verified online payment. Saving a UI
// preference must never turn a successful order into a checkout error.
export async function rememberPaymentMethod(method: PaymentMethod, target: { orderId: string } | { tripId: string }): Promise<void> {
  try {
    await apiRequest('/payments/preference', { method: 'PATCH', body: { method, ...target } });
  } catch {
    // The next checkout can fall back to the server's real order history.
  }
}

export type PaymentTarget = { orderId: string } | { tripId: string };

export interface RazorpayOrder {
  provider: 'razorpay';
  providerOrderId: string;
  keyId: string;
  amount: number; // rupees, for display only
  amountPaise: number; // server-calculated checkout amount
  currency: 'INR';
  environment: 'sandbox' | 'production';
  expiresAt: string;
  customer?: { contact?: string; email?: string; name?: string };
}

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Backend reconciles and returns the same provider order on retries.
export function createPaymentOrder(target: PaymentTarget): Promise<RazorpayOrder> {
  return apiRequest('/payments/create-order', { method: 'POST', body: { ...target, provider: 'razorpay' } });
}

// The server verifies a complete SDK signature (when provided), then fetches
// captured payment, amount, currency and ownership before committing success.
export function verifyPayment(target: PaymentTarget, result?: RazorpayPaymentResult): Promise<{ ok: boolean }> {
  return apiRequest('/payments/verify', { method: 'POST', body: { ...target, ...result } });
}

export interface PaymentRecovery {
  target: PaymentTarget;
  state: 'paid' | 'unpaid' | 'pending' | 'reconciling' | 'expired' | 'cancelled';
  record: { id: string; total: number; status: string; provider_payment_id: string | null };
}
export function recoverPayment(target: PaymentTarget): Promise<PaymentRecovery> {
  return apiRequest('/payments/recovery', { method: 'POST', body: target });
}
// POST /payments/abandon — cancel an unpaid checkout or switch it to cash on
// delivery. The server re-reads the provider first: a captured payment is settled
// (409 PAYMENT_CAPTURED), an authorized one is waited for (409
// PAYMENT_RECONCILING); any capture landing later is refunded automatically.
export function abandonCheckout(target: PaymentTarget, action: 'cancel' | 'cod'): Promise<{ target: PaymentTarget; state: 'paid' | 'cancelled' }> {
  return apiRequest('/payments/abandon', { method: 'POST', body: { ...target, action } });
}
export function fetchPendingPayments(): Promise<PaymentTarget[]> {
  return apiRequest('/payments/pending');
}

export function selectPaymentPreference(method: PaymentMethod): Promise<{ method: PaymentMethod }> {
  return apiRequest('/payments/preferred-method', { method: 'PATCH', body: { method } });
}
