// Rider delivery-failure reason labels — MIRRORED from the canonical source
// packages/shared/src/orders/deliveryFailureReasons.ts. Admin is not a member
// of @flikk/shared (no dep, no workspace link), same situation the refunds
// page notes for its cancel-reason map. Keep this list identical to the shared
// one; a rider stores the CODE on the order's cancel_reason column when a drop
// fails (status 'failed' disambiguates it from a real cancellation).
const DELIVERY_FAILURE_REASON_LABELS: Record<string, string> = {
  customer_unreachable: 'Customer unreachable',
  wrong_address: 'Wrong address',
  address_not_found: 'Address not found',
  customer_refused_delivery: 'Customer refused delivery',
  other: 'Other',
};

// Code -> label; falls back to the raw code so an unknown/legacy value still
// renders something (mirrors riderDeliveryFailureReasonLabel in shared).
export function deliveryFailureReasonLabel(code: string | null): string {
  if (!code) return '—';
  return DELIVERY_FAILURE_REASON_LABELS[code] ?? code;
}
