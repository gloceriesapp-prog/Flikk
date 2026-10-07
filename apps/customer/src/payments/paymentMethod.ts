import type { UpiApp } from './upiApps';

export type PaymentMethod = 'cod' | 'online' | 'card' | 'upi_id' | `upi_app:${string}`;

export function paymentMethodLabel(method: PaymentMethod, apps: UpiApp[]): string {
  if (method === 'cod') return 'Cash on delivery';
  if (method === 'card') return 'Credit / debit card';
  if (method === 'online') return 'More payment options';
  if (method === 'upi_id') return 'UPI ID';
  return apps.find((app) => `upi_app:${app.id}` === method)?.name ?? 'UPI';
}

// 'upi_id' is only usable with a verified UPI ID in hand for this checkout.
export function availablePaymentMethod(method: string | null, apps: UpiApp[], hasVerifiedVpa = false): PaymentMethod | null {
  if (method === 'cod' || method === 'card' || method === 'online') return method;
  if (method === 'upi_id') return hasVerifiedVpa ? method : null;
  return apps.some((app) => `upi_app:${app.id}` === method) ? method as PaymentMethod : null;
}
