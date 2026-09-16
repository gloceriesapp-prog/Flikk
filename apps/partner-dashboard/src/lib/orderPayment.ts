import type { PartnerOrder } from './partnerApi';

// This product is Razorpay/UPI-only (no COD anywhere in the schema) — see
// razorpay_payment_id's own doc comment in partnerApi.ts. So "Paid" vs
// "Pending" here is a real payment-capture status, not a payment method.
export function paymentStatus(order: Pick<PartnerOrder, 'razorpay_payment_id'>): { label: string; className: string } {
  return order.razorpay_payment_id
    ? { label: 'Paid', className: 'bg-emerald-50 text-emerald-600' }
    : { label: 'Pending', className: 'bg-amber-50 text-amber-600' };
}
