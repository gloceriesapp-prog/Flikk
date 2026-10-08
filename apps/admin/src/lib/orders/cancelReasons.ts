// Readable labels for the reason CODES stored in orders.cancel_reason. Codes
// are mirrored from packages/shared/src/orders/cancelReasons.ts (rider cancel
// and store reject codes) and backend/src/jobs/storeNoResponse.ts (the
// server-side auto-cancel). Admin is not a member of @gloceries/shared, so
// keep these lists identical by hand. Free-text reasons (customers, admins,
// older app versions) fall through unchanged.
import { deliveryFailureReasonLabel } from './deliveryFailureReasons';

const CANCEL_REASON_LABELS: Record<string, string> = {
  // Rider cancel (pre-pickup).
  store_closed: 'Store is closed',
  store_out_of_stock: 'Store out of items',
  store_refused_handover: 'Store refused to hand over',
  long_wait_at_store: 'Waiting too long at store',
  vehicle_breakdown: 'Vehicle breakdown',
  unsafe_conditions: 'Unsafe to continue',
  // Store reject (partner app / partner dashboard).
  store_too_busy: 'Store too busy',
  store_price_or_item_issue: 'Price or item issue',
  // Server job: the store never answered within the response window.
  store_no_response: 'Store did not respond in time',
  other: 'Other',
};

export function cancelReasonLabel(reason: string | null | undefined): string {
  if (!reason) return '—';
  return CANCEL_REASON_LABELS[reason] ?? reason;
}

// orders.cancel_reason holds a cancel reason for 'cancelled' and a delivery
// failure code for 'failed'; the status says which list applies.
export function orderReasonLabel(status: string, reason: string | null | undefined): string {
  return status === 'failed' ? deliveryFailureReasonLabel(reason ?? null) : cancelReasonLabel(reason);
}

export const CANCELLED_BY_LABELS: Record<string, string> = {
  customer: 'Customer',
  store_owner: 'Store',
  rider: 'Rider',
  admin: 'Admin',
  system: 'Automatic',
};
