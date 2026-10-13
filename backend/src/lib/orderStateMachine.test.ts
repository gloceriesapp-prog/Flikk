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

  it('allows delivery-failure only from out_for_delivery (post-pickup)', () => {
    expect(isValidTransition('out_for_delivery', 'failed')).toBe(true);
    // placed/packed are pre-pickup — that escape hatch is 'cancelled', not 'failed'.
    expect(isValidTransition('placed', 'failed')).toBe(false);
    expect(isValidTransition('packed', 'failed')).toBe(false);
  });

  it('treats failed as terminal', () => {
    expect(isValidTransition('failed', 'placed')).toBe(false);
    expect(isValidTransition('failed', 'out_for_delivery')).toBe(false);
    expect(isValidTransition('failed', 'delivered')).toBe(false);
    expect(isValidTransition('failed', 'cancelled')).toBe(false);
  });

  it('scopes failed to the rider only', () => {
    expect(canRoleTransition('rider', 'failed')).toBe(true);
    expect(canRoleTransition('store_owner', 'failed')).toBe(false);
    expect(canRoleTransition('customer', 'failed')).toBe(false);
    expect(canRoleTransition('admin', 'failed')).toBe(false);
  });

  it('rejects transitions from a terminal state', () => {
    expect(isValidTransition('delivered', 'packed')).toBe(false);
    expect(isValidTransition('cancelled', 'placed')).toBe(false);
  });

  it('scopes packed/out_for_delivery/delivered to exactly one role', () => {
    expect(canRoleTransition('store_owner', 'packed')).toBe(true);
    expect(canRoleTransition('rider', 'packed')).toBe(false);
    expect(canRoleTransition('rider', 'out_for_delivery')).toBe(true);
    expect(canRoleTransition('rider', 'delivered')).toBe(true);
    expect(canRoleTransition('customer', 'delivered')).toBe(false);
  });

  // cancelled is the one deliberate exception with three owners, not one —
  // see orderStateMachine.ts's own note: a store owner needs to decline a
  // fresh order (out of stock, closing early) via the partner app's real
  // Reject button / auto-reject-on-timeout (useOrderExpiryWatcher.ts), a
  // rider needs the same real escape hatch for an order they haven't
  // picked up yet (apps/rider's CancelOrderModal), on top of admin's
  // founder-override. Still gated by isValidTransition to only
  // 'placed'/'packed' — none of the three can cancel an order that's
  // already out for delivery or delivered.
  it('scopes cancelled to store_owner, admin, rider, and customer', () => {
    expect(canRoleTransition('store_owner', 'cancelled')).toBe(true);
    expect(canRoleTransition('admin', 'cancelled')).toBe(true);
    expect(canRoleTransition('rider', 'cancelled')).toBe(true);
    // Customer cancellation (real UPI/Razorpay refund flow, routes/
    // orders.ts's PATCH /:id/status) — added deliberately so a customer
    // can back out of their own still-cancellable order, same isValidTransition
    // gate below (placed/packed only) as every other role here.
    expect(canRoleTransition('customer', 'cancelled')).toBe(true);
  });
});
