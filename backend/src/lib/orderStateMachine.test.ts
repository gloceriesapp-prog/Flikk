import { describe, expect, it } from 'vitest';
import { canRoleTransition, isValidTransition } from './orderStateMachine.js';

describe('order state machine', () => {
  it('allows the happy path', () => {
    expect(isValidTransition('placed', 'packed')).toBe(true);
    expect(isValidTransition('packed', 'out_for_delivery')).toBe(true);
    expect(isValidTransition('out_for_delivery', 'delivered')).toBe(true);
  });

  it('allows cancellation only from placed or packed', () => {
    expect(isValidTransition('placed', 'cancelled')).toBe(true);
    expect(isValidTransition('packed', 'cancelled')).toBe(true);
    expect(isValidTransition('out_for_delivery', 'cancelled')).toBe(false);
    expect(isValidTransition('delivered', 'cancelled')).toBe(false);
  });

  it('rejects skipping states', () => {
    expect(isValidTransition('placed', 'out_for_delivery')).toBe(false);
    expect(isValidTransition('placed', 'delivered')).toBe(false);
    expect(isValidTransition('packed', 'delivered')).toBe(false);
  });

  it('rejects transitions from a terminal state', () => {
    expect(isValidTransition('delivered', 'packed')).toBe(false);
    expect(isValidTransition('cancelled', 'placed')).toBe(false);
  });

  it('scopes each transition to exactly one role', () => {
    expect(canRoleTransition('store_owner', 'packed')).toBe(true);
    expect(canRoleTransition('rider', 'packed')).toBe(false);
    expect(canRoleTransition('rider', 'out_for_delivery')).toBe(true);
    expect(canRoleTransition('rider', 'delivered')).toBe(true);
    expect(canRoleTransition('customer', 'delivered')).toBe(false);
    expect(canRoleTransition('admin', 'cancelled')).toBe(true);
    expect(canRoleTransition('store_owner', 'cancelled')).toBe(false);
  });
});
