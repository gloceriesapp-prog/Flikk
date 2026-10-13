import type { UpiApp } from './upiApps';

// Native checkout owns online payment entry and supported app selection.
export type PaymentMethod = 'cod' | 'online' | 'card' | 'netbanking' | `upi_app:${string}`;

export function paymentMethodLabel(method: PaymentMethod, apps: UpiApp[]): string {
  if (method === 'cod') return 'Cash on delivery';
  if (method === 'card') return 'Credit / debit card';
  if (method === 'netbanking') return 'Netbanking';
  if (method === 'online') return 'More payment options';
  return apps.find((app) => `upi_app:${app.id}` === method)?.name ?? 'UPI';
}

// Methods the server currently accepts for a new checkout (GET
// /payments/availability). Unknown (still loading or unreachable) allows
// both; the server refuses a switched-off method at order creation anyway.
export interface AllowedPaymentMethods {
  cod: boolean;
  online: boolean;
}

// Preferences never bypass the backend's availability check.
export function availablePaymentMethod(method: string | null, apps: UpiApp[],
  allowed: AllowedPaymentMethods = { cod: true, online: true }): PaymentMethod | null {
  if (method === 'cod') return allowed.cod ? method : null;
  if (!allowed.online) return null;
  if (method === 'card' || method === 'online' || method === 'netbanking') return method;
  return apps.some((app) => `upi_app:${app.id}` === method) ? method as PaymentMethod : null;
}
