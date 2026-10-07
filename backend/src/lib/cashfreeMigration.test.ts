import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Behaviour is proven by tests/sql/cashfree-payments.sql on a real Postgres;
// this guards the migration text against accidental edits.
const sql = readFileSync(new URL('../../migrations/103_cashfree_payments.sql', import.meta.url), 'utf8');
const functions = sql.split(/(?=CREATE (?:OR REPLACE )?FUNCTION)/).slice(1).map(chunk => chunk.split(/\$(?:function)?\$\s*;/)[0]);

describe('migration 103 (Cashfree)', () => {
  it('renames every Razorpay column to provider_*', () => {
    for (const [table, from, to] of [
      ['orders', 'razorpay_payment_id', 'provider_payment_id'],
      ['orders', 'razorpay_refund_id', 'provider_refund_id'],
      ['trips', 'razorpay_order_id', 'provider_order_id'],
      ['trips', 'razorpay_payment_id', 'provider_payment_id'],
    ]) expect(sql).toContain(`ALTER TABLE public.${table} RENAME COLUMN ${from} TO ${to};`);
  });

  it('adds payment_provider to orders, trips and checkout sessions', () => {
    for (const table of ['orders', 'trips', 'checkout_payment_sessions'])
      expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${table} ADD COLUMN payment_provider text NOT NULL DEFAULT 'cashfree'`));
  });

  it('re-creates the payment functions without any razorpay_ reference', () => {
    expect(functions.length).toBeGreaterThanOrEqual(20);
    for (const body of functions) expect(body).not.toMatch(/razorpay_/i);
    for (const name of ['settle_checkout_payment', 'claim_checkout_payment', 'queue_cancelled_order_refund', 'enqueue_trip_refund', 'mark_order_refund_manual'])
      expect(functions.some(body => body.includes(`FUNCTION public.${name}(`))).toBe(true);
  });

  it('routes legacy refunds to manual_required, runs in one transaction', () => {
    expect(sql).toMatch(/^BEGIN;$/m);
    expect(sql).toMatch(/^COMMIT;$/m);
    expect(sql).toContain("SET LOCAL lock_timeout='5s';");
    for (const check of ['orders_refund_status_check', 'order_refund_jobs_status_check', 'trip_refunds_status_check'])
      expect(sql).toMatch(new RegExp(`ADD CONSTRAINT ${check} CHECK \\([^)]*'manual_required'`));
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.mark_order_refund_manual(uuid,text) TO service_role;');
  });
});
