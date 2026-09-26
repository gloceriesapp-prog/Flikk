// Rider cancel reasons — structured {code, label} pairs, not free text.
//
// Cancel is only ever available PRE-PICKUP: the rider app shows the Cancel
// action only while an order is 'assigned' (OrderDetailScreen), and the
// backend order state machine allows the 'cancelled' transition only from
// placed/packed (lib/orderStateMachine.ts). So every reason here is a
// pickup-phase failure the rider hits before taking the parcel.
//
// Drop-phase reasons ("customer unreachable", "wrong address") are
// deliberately ABSENT: by the time those apply the rider has already picked
// up and can no longer cancel. That case needs a separate failed-delivery
// flow, which does not exist yet — see the backend mirror
// (backend/src/lib/cancelReasons.ts) and the flag raised at build time.
export interface CancelReason {
  code: string;
  label: string;
}

export const RIDER_CANCEL_REASONS: readonly CancelReason[] = [
  { code: 'store_closed', label: 'Store is closed' },
  { code: 'store_out_of_stock', label: 'Store out of items' },
  { code: 'store_refused_handover', label: 'Store refused to hand over' },
  { code: 'long_wait_at_store', label: 'Waiting too long at store' },
  { code: 'vehicle_breakdown', label: 'Vehicle breakdown' },
  { code: 'unsafe_conditions', label: 'Unsafe to continue' },
  { code: 'other', label: 'Other' },
] as const;

export type RiderCancelReasonCode = (typeof RIDER_CANCEL_REASONS)[number]['code'];

const CODES = new Set<string>(RIDER_CANCEL_REASONS.map((r) => r.code));

export function isRiderCancelReasonCode(value: unknown): value is RiderCancelReasonCode {
  return typeof value === 'string' && CODES.has(value);
}

// Code -> label lookup for display surfaces that store the code (rider app,
// and admin's refunds page showing what a rider picked). Falls back to the
// raw code so an unknown/legacy free-text reason still renders something.
export function riderCancelReasonLabel(code: string): string {
  return RIDER_CANCEL_REASONS.find((r) => r.code === code)?.label ?? code;
}
