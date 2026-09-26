// Rider delivery-failure reasons — structured {code, label} pairs, not free
// text. Sibling of cancelReasons.ts, for the OPPOSITE phase of the job.
//
// Delivery-failure is only ever available POST-PICKUP: the rider app shows
// the "Delivery failed" action only once an order is picked_up /
// arrived_at_customer (OrderDetailScreen), and the backend order state
// machine allows the 'failed' transition only from out_for_delivery
// (lib/orderStateMachine.ts). So every reason here is a drop-phase failure
// the rider hits AFTER taking the parcel — the exact set that cancelReasons.ts
// deliberately omits (cancel is pickup-phase only).
//
// See the backend mirror (backend/src/lib/deliveryFailureReasons.ts); keep the
// two lists identical (a test asserts it).
export interface DeliveryFailureReason {
  code: string;
  label: string;
}

export const RIDER_DELIVERY_FAILURE_REASONS: readonly DeliveryFailureReason[] = [
  { code: 'customer_unreachable', label: 'Customer unreachable' },
  { code: 'wrong_address', label: 'Wrong address' },
  { code: 'address_not_found', label: 'Address not found' },
  { code: 'customer_refused_delivery', label: 'Customer refused delivery' },
  { code: 'other', label: 'Other' },
] as const;

export type RiderDeliveryFailureReasonCode = (typeof RIDER_DELIVERY_FAILURE_REASONS)[number]['code'];

const CODES = new Set<string>(RIDER_DELIVERY_FAILURE_REASONS.map((r) => r.code));

export function isRiderDeliveryFailureReasonCode(value: unknown): value is RiderDeliveryFailureReasonCode {
  return typeof value === 'string' && CODES.has(value);
}

// Code -> label lookup for display surfaces that store the code (rider app,
// and admin's refunds page showing why a drop failed). Falls back to the raw
// code so an unknown/legacy value still renders something.
export function riderDeliveryFailureReasonLabel(code: string): string {
  return RIDER_DELIVERY_FAILURE_REASONS.find((r) => r.code === code)?.label ?? code;
}
