// Source: specs/00-foundation/data-model.md + api-conventions.md
// placed -> packed -> out_for_delivery -> delivered
// cancelled reachable only from placed or packed.
// Each transition is owned by exactly one role — a role attempting a transition
// outside its own set is a 403, not a 409 (see routes/orders.ts).
//
// cancelled is owned by store_owner, admin, rider, AND customer — a store
// owner declining a brand-new order (out of stock, closing early) is a
// normal real scenario at this app's own scale (matches the partner app's
// already-built Reject button + auto-reject-on-timeout, apps/partner/src/
// features/order-expiry — those need a real transition to call, not a
// local-only UI flag), not just a founder override. A rider needs the
// same real escape hatch (apps/rider's own CancelOrderModal: vehicle
// breakdown, unsafe address) for an order they haven't picked up yet —
// routes/orders.ts's own rider-ownership check (rider_id must match the
// caller) already scopes this to their own assignment, same as every
// other status write a rider makes. The customer's own cancel button
// (TrackOrderScreen.tsx) needs the identical real transition, not a
// separate endpoint — routes/orders.ts's own customer-ownership check
// (order.customer_id must match the caller) scopes it the same way.
// isValidTransition still only allows cancelled from 'placed' or 'packed',
// so none of these four roles can cancel an order that's already out for
// delivery (rider has picked it up from the store) or delivered — this is
// the exact, already-enforced cutoff a customer-facing cancel button must
// respect, not a separate rule to reimplement in the UI.

// 'failed' is the POST-pickup counterpart to 'cancelled': a terminal state a
// rider reaches from out_for_delivery when the drop itself can't be completed
// (customer unreachable, wrong address). It is deliberately NOT reachable from
// placed/packed — that pre-pickup escape hatch is 'cancelled'. See
// routes/orders.ts for the reason-code requirement and the rider payout on
// failure (the rider still did the ride, so they're paid the full fee).
export type OrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';
export type Role = 'customer' | 'store_owner' | 'rider' | 'admin';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'failed'],
  delivered: [],
  cancelled: [],
  failed: [],
};

const TRANSITION_OWNER: Record<OrderStatus, Role[]> = {
  placed: [],
  packed: ['store_owner'],
  out_for_delivery: ['rider'],
  delivered: ['rider'],
  cancelled: ['store_owner', 'admin', 'rider', 'customer'],
  // Only the rider on the drop can declare a delivery failed — they're the
  // one at the door. Admin's manual escape hatch stays 'cancelled'.
  failed: ['rider'],
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function canRoleTransition(role: Role, to: OrderStatus): boolean {
  return TRANSITION_OWNER[to].includes(role);
}

export function timestampColumnFor(to: OrderStatus): string | null {
  switch (to) {
    case 'packed':
      return 'packed_at';
    case 'out_for_delivery':
      return 'picked_up_at';
    case 'delivered':
      return 'delivered_at';
    default:
      return null;
  }
}
