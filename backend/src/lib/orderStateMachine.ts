// Source: specs/00-foundation/data-model.md + api-conventions.md
// placed -> packed -> out_for_delivery -> delivered
// cancelled reachable only from placed or packed.
// Each transition is owned by exactly one role — a role attempting a transition
// outside its own set is a 403, not a 409 (see routes/orders.ts).

export type OrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type Role = 'customer' | 'store_owner' | 'rider' | 'admin';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

const TRANSITION_OWNER: Record<OrderStatus, Role[]> = {
  placed: [],
  packed: ['store_owner'],
  out_for_delivery: ['rider'],
  delivered: ['rider'],
  cancelled: ['admin'],
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
