// Customer payment endpoints (backend/PAYMENTS.md, Cashfree). The client
// holds no provider secret and never self-reports success: POST /verify makes
// the server re-fetch the payment from Cashfree before settling anything.

import { Platform } from 'react-native';
import { apiRequest } from './client';
import type { PaymentMethod } from '../payments/paymentMethod';

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

export interface CashfreeOrder {
  provider: 'cashfree';
  providerOrderId: string;
  paymentSessionId: string;
  amount: number;
  environment: 'sandbox' | 'production';
}

// Reuses the SAME provider order for a given order/trip (server-side claim),
// so retrying never creates a second charge target.
export function createPaymentOrder(target: PaymentTarget): Promise<CashfreeOrder> {
  return apiRequest('/payments/create-order', { method: 'POST', body: target });
}

// Per-app UPI links from Cashfree "Order Pay" (channel 'link'). `default` is
// the generic upi://pay link; per-app keys are only present when Cashfree
// returned them. Opened exactly as received (payments/upiIntent.ts).
export interface UpiIntentLinks {
  default: string;
  [app: string]: string | undefined;
}
export interface UpiIntentPayment {
  providerOrderId: string;
  links: UpiIntentLinks;
}
export function createUpiIntentPayment(target: PaymentTarget, app: string): Promise<UpiIntentPayment> {
  return apiRequest('/payments/upi/intent', { method: 'POST', body: { ...target, app, platform: Platform.OS === 'ios' ? 'ios' : 'android' } });
}

// Format check always; name lookup only when the backend has the Cashfree
// verification suite configured (name may be null even when valid).
export function validateVpa(vpa: string): Promise<{ valid: boolean; name: string | null }> {
  return apiRequest('/payments/upi/validate', { method: 'POST', body: { vpa } });
}

// UPI collect request: the customer approves it inside their UPI app.
// expiresAt is optional in the contract; the processing screen falls back to
// its own poll budget when absent.
export function createUpiCollectPayment(target: PaymentTarget, vpa: string): Promise<{ providerOrderId?: string; expiresAt?: string | null }> {
  return apiRequest('/payments/upi/collect', { method: 'POST', body: { ...target, vpa } });
}

// Server fetches the order + payments from Cashfree and settles only on a
// SUCCESS payment with a matching amount. ok:false = not paid (yet).
export function verifyPayment(target: PaymentTarget): Promise<{ ok: boolean }> {
  return apiRequest('/payments/verify', { method: 'POST', body: target });
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
// delivery. The server re-reads Cashfree first: a captured payment is settled
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
