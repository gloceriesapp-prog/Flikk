import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isValidTransition, type OrderStatus } from './orderStateMachine.js';

// Guards against drift between the TS order state machine and the admin SQL
// RPCs that re-implement the transition guards (migration 109). The two are
// kept separate on purpose (the SQL is a SECURITY DEFINER role-override), so
// this test is the thing that fails CI if either side changes without the
// other. See the single-source note in orderStateMachine.ts.

// The exact moves the admin SQL RPCs permit, encoded from migration 109:
//   admin_advance_order_status: placed->packed, packed->out_for_delivery
//   admin_cancel_order:          placed->cancelled, packed->cancelled
const ADMIN_SQL_TRANSITIONS: [OrderStatus, OrderStatus][] = [
  ['placed', 'packed'],
  ['packed', 'out_for_delivery'],
  ['placed', 'cancelled'],
  ['packed', 'cancelled'],
];

// Rider-only terminal moves the admin override must never be able to make.
const RIDER_ONLY_TRANSITIONS: [OrderStatus, OrderStatus][] = [
  ['out_for_delivery', 'delivered'],
  ['out_for_delivery', 'failed'],
];

const migrationSql = readFileSync(
  fileURLToPath(new URL('../../migrations/109_admin_order_control.sql', import.meta.url)),
  'utf8',
).replace(/\s+/g, ' ');

describe('admin SQL order transitions stay consistent with the TS state machine', () => {
  it('every transition the admin SQL permits is a valid transition in the TS machine', () => {
    for (const [from, to] of ADMIN_SQL_TRANSITIONS) expect(isValidTransition(from, to)).toBe(true);
  });

  it('admin SQL never reaches the rider-only terminal moves', () => {
    // They are valid moves in the base machine (a rider makes them)...
    for (const [from, to] of RIDER_ONLY_TRANSITIONS) expect(isValidTransition(from, to)).toBe(true);
    // ...but they are not in the admin override set.
    for (const move of RIDER_ONLY_TRANSITIONS)
      expect(ADMIN_SQL_TRANSITIONS).not.toContainEqual(move);
  });

  // Tie the encoded set to the actual SQL source: editing the guards in
  // migration 109 without updating ADMIN_SQL_TRANSITIONS fails here.
  it('the migration SQL still contains exactly the encoded advance/cancel guards', () => {
    expect(migrationSql).toContain("prev='placed' AND p_to='packed'");
    expect(migrationSql).toContain("prev='packed' AND p_to='out_for_delivery'");
    // admin_cancel_order allows cancel only from placed/packed.
    expect(migrationSql).toContain("o.status NOT IN('placed','packed')");
    // The advance RPC must not have grown a path to delivered or failed.
    expect(migrationSql).not.toContain("p_to='delivered'");
    expect(migrationSql).not.toContain("p_to='failed'");
  });
});
