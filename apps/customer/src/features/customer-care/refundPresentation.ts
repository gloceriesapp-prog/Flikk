import type { Refund } from './api';
export const REFUND_LABELS: Record<Refund['status'], string> = {
  queued: 'Refund requested', processing: 'Refund processing', completed: 'Refund completed',
  failed: 'Refund needs attention', manual_required: 'Refund under review',
};
export function refundPresentation(status: string, providerRefundId?: string | null) {
  if (status === 'completed') return { title: REFUND_LABELS.completed, message: 'Your refund has been processed to the original payment method. Your bank may take 5–7 working days to show the credit.' };
  if (status === 'failed' || status === 'manual_required') return { title: status === 'failed' ? REFUND_LABELS.failed : REFUND_LABELS.manual_required,
    message: 'Your refund needs attention from our team. Contact support with your order details. You do not need to pay again.' };
  if (status === 'processing' && providerRefundId) return { title: 'Refund initiated', message: 'Your refund has been initiated to the original payment method. It usually takes 5–7 working days for your bank to show the credit.' };
  return { title: REFUND_LABELS.queued, message: 'Your refund is queued. We’ll update you when it is initiated. You do not need to request it again.' };
}
export const refundReason = (reason: string) => ({ store_no_response: 'Store did not accept the order in time', customer_cancelled: 'Order cancelled', store_closed: 'Store is closed', store_out_of_stock: 'Store out of items', store_refused_handover: 'Store could not fulfil the order', long_wait_at_store: 'Pickup delay', vehicle_breakdown: 'Delivery vehicle issue', unsafe_conditions: 'Unsafe delivery conditions', other: 'Order issue' } as Record<string, string>)[reason] ?? reason;
