// Maps to POST /payments/create-order. Returns just enough to open Razorpay
// Checkout client-side (order id + publishable key_id) — the secret key
// never leaves the backend, see backend/src/routes/payments.ts.

import { apiRequest } from './client';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export function createRazorpayOrder(orderId: string): Promise<RazorpayOrder> {
  return apiRequest('/payments/create-order', { method: 'POST', body: { orderId } });
}
