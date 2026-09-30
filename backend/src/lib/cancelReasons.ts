// Mirror of packages/shared/src/orders/cancelReasons.ts. The backend is NOT a
// workspace member of @gloceries/shared (only the Expo apps are — see that
// package's index note), so these codes are duplicated here rather than
// imported, the same manual-sync exception CLAUDE.md's "copied, not shared"
// rule already covers (cf. DELIVERY_FEE in apps/rider). Keep the two lists
// identical.
//
// Only the codes matter server-side — labels are a display concern the apps
// own. This validates that a rider-supplied cancel reason is one of the known
// codes; partner-reject and customer-cancel reasons on the same endpoint stay
// free text (the validator in routes/orders.ts is scoped to role === 'rider').
export const RIDER_CANCEL_REASON_CODES = [
  'store_closed',
  'store_out_of_stock',
  'store_refused_handover',
  'long_wait_at_store',
  'vehicle_breakdown',
  'unsafe_conditions',
  'other',
] as const;

export type RiderCancelReasonCode = (typeof RIDER_CANCEL_REASON_CODES)[number];

const CODES = new Set<string>(RIDER_CANCEL_REASON_CODES);

export function isRiderCancelReasonCode(value: unknown): value is RiderCancelReasonCode {
  return typeof value === 'string' && CODES.has(value);
}
