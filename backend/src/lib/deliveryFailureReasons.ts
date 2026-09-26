// Mirror of packages/shared/src/orders/deliveryFailureReasons.ts. The backend
// is NOT a workspace member of @flikk/shared (only the Expo apps are), so these
// codes are duplicated here rather than imported — the same manual-sync
// exception CLAUDE.md's "copied, not shared" rule already covers (cf.
// cancelReasons.ts). Keep the two lists identical (deliveryFailureReasons.test.ts
// asserts it).
//
// Only the codes matter server-side — labels are a display concern the apps
// own. This validates that a rider-supplied delivery-failure reason is one of
// the known codes; the validator in routes/orders.ts is scoped to
// role === 'rider' on the 'failed' transition, the post-pickup counterpart to
// the cancel-reason check on the 'cancelled' transition.
export const RIDER_DELIVERY_FAILURE_REASON_CODES = [
  'customer_unreachable',
  'wrong_address',
  'address_not_found',
  'customer_refused_delivery',
  'other',
] as const;

export type RiderDeliveryFailureReasonCode = (typeof RIDER_DELIVERY_FAILURE_REASON_CODES)[number];

const CODES = new Set<string>(RIDER_DELIVERY_FAILURE_REASON_CODES);

export function isRiderDeliveryFailureReasonCode(value: unknown): value is RiderDeliveryFailureReasonCode {
  return typeof value === 'string' && CODES.has(value);
}
