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

// Store reject reasons (mirror of STORE_REJECT_REASONS in
// packages/shared/src/orders/cancelReasons.ts) plus the auto-reject code.
// Store owners send one of these as the reject reason; older partner app
// builds sent none, so a missing reason stays accepted.
export const STORE_REJECT_REASON_CODES = [
  'store_out_of_stock',
  'store_closed',
  'store_too_busy',
  'store_price_or_item_issue',
  'store_no_response',
  'other',
] as const;

const STORE_CODES = new Set<string>(STORE_REJECT_REASON_CODES);

export function isStoreRejectReasonCode(value: unknown): value is (typeof STORE_REJECT_REASON_CODES)[number] {
  return typeof value === 'string' && STORE_CODES.has(value);
}
