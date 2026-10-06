import type { UpiApp } from './upiApps';

export type PaymentMethod = 'cod' | 'online' | 'card' | 'upi_id' | `upi_app:${string}`;

export function paymentMethodLabel(method: PaymentMethod, apps: UpiApp[]): string {
  if (method === 'cod') return 'Cash on delivery';
  if (method === 'card') return 'Credit / debit card';
  if (method === 'online') return 'More payment options';
  if (method === 'upi_id') return 'UPI';
  return apps.find((app) => `upi_app:${app.id}` === method)?.name ?? 'UPI';
}

export function availablePaymentMethod(method: string | null, apps: UpiApp[]): PaymentMethod | null {
  if (method === 'cod' || method === 'card' || method === 'online') return method;
  return apps.some((app) => `upi_app:${app.id}` === method) ? method as PaymentMethod : null;
}
