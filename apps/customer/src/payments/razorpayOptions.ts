import type { RazorpayOrder, RazorpayPaymentResult } from '../api/payments';
import type { PaymentMethod } from './paymentMethod';

export function razorpayOptions(order: RazorpayOrder, method: PaymentMethod = 'online', nowMs = Date.now()) {
  const expires = Date.parse(order.expiresAt);
  if (order.provider !== 'razorpay' || !/^order_[a-zA-Z0-9]+$/.test(order.providerOrderId)
    || !/^rzp_(live|test)_[a-zA-Z0-9]+$/.test(order.keyId) || order.currency !== 'INR'
    || !Number.isSafeInteger(order.amountPaise) || order.amountPaise <= 0
    || !Number.isFinite(order.amount) || Math.round(order.amount * 100) !== order.amountPaise
    || (order.keyId.startsWith('rzp_live_') ? 'production' : 'sandbox') !== order.environment) {
    throw new Error('Payment details could not be verified. Check your saved order before paying.');
  }
  if (!Number.isFinite(expires) || expires <= nowMs) {
    throw new Error('This checkout has expired. Review your saved order.');
  }
  // Standard SDK documents method preselection only with real email AND
  // contact. Never manufacture an email or an app-specific UPI payload.
  const customer = order.customer ?? {};
  const preferredMethod = method === 'card' || method === 'netbanking' ? method
    : method.startsWith('upi_app:') ? 'upi' : undefined;
  return {
    key: order.keyId,
    order_id: order.providerOrderId,
    amount: order.amountPaise,
    currency: order.currency,
    name: 'Gloceries',
    description: 'Groceries and essentials',
    prefill: {
      ...customer,
      ...(preferredMethod && customer.contact && customer.email ? { method: preferredMethod } : {}),
    },
    theme: { color: '#155DFC' },
    timeout: Math.max(1, Math.floor((expires - nowMs) / 1000)),
    modal: { confirm_close: true },
  };
}

// These values are forwarded as evidence only. HMAC and captured-state
// validation happen on the backend using its stored provider order ID.
export function razorpayResult(value: unknown, providerOrderId: string): RazorpayPaymentResult {
  const data = value as Partial<RazorpayPaymentResult> | null;
  if (!data || data.razorpay_order_id !== providerOrderId
    || typeof data.razorpay_payment_id !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(data.razorpay_payment_id)
    || typeof data.razorpay_signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(data.razorpay_signature)) {
    throw new Error('The payment result needs checking. Open your saved order to confirm its status.');
  }
  return { razorpay_order_id: data.razorpay_order_id, razorpay_payment_id: data.razorpay_payment_id, razorpay_signature: data.razorpay_signature };
}
