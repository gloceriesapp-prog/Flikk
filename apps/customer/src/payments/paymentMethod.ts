import type { UpiApp } from './upiApps';

// 'card' / 'netbanking' open Cashfree's checkout limited to that mode
// (openCashfreeCheckout); 'online' opens it with every enabled mode.
export type PaymentMethod = 'cod' | 'online' | 'card' | 'netbanking' | 'upi_id' | `upi_app:${string}`;

export function paymentMethodLabel(method: PaymentMethod, apps: UpiApp[]): string {
  if (method === 'cod') return 'Cash on delivery';
  if (method === 'card') return 'Credit / debit card';
  if (method === 'netbanking') return 'Netbanking';
  if (method === 'online') return 'More payment options';
  if (method === 'upi_id') return 'UPI ID';
  return apps.find((app) => `upi_app:${app.id}` === method)?.name ?? 'UPI';
}

// Methods the server currently accepts for a new checkout (GET
// /payments/availability). Unknown (still loading or unreachable) allows
// both; the server refuses a switched-off method at order creation anyway.
export interface AllowedPaymentMethods {
  cod: boolean;
  online: boolean;
}

// 'upi_id' is only usable with a verified UPI ID in hand for this checkout,
// and only where UPI collect is still allowed (see UPI_ID_SUPPORTED).
export function availablePaymentMethod(method: string | null, apps: UpiApp[], hasVerifiedVpa = false, upiIdSupported = true,
  allowed: AllowedPaymentMethods = { cod: true, online: true }): PaymentMethod | null {
  if (method === 'cod') return allowed.cod ? method : null;
  if (!allowed.online) return null;
  if (method === 'card' || method === 'online' || method === 'netbanking') return method;
  if (method === 'upi_id') return upiIdSupported && hasVerifiedVpa ? method : null;
  return apps.some((app) => `upi_app:${app.id}` === method) ? method as PaymentMethod : null;
}
