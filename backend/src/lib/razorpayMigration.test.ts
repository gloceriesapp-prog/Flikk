import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const directory = new URL('../../migrations/', import.meta.url);
const file = readdirSync(directory).find(name => name.endsWith('_razorpay_provider_checkout.sql'))!;
const sql = readFileSync(new URL(file, directory), 'utf8');

describe('Razorpay provider cutover migration', () => {
  it('switches defaults without relabeling historical payments', () => {
    for (const table of ['orders', 'trips', 'checkout_payment_sessions']) {
      expect(sql).toContain(`ALTER TABLE public.${table} ALTER COLUMN payment_provider SET DEFAULT 'razorpay'`);
    }
    expect(sql).not.toMatch(/UPDATE\s+(?:public\.)?(?:orders|trips|checkout_payment_sessions)\s+SET\s+payment_provider/i);
  });
  it('removes the optional amount guard and fences captures to an attached provider order', () => {
    expect(sql).toContain('DROP FUNCTION public.settle_checkout_payment(uuid,uuid,text,bigint,text)');
    expect(sql).toContain('p_expected_paise IS NULL OR p_currency IS NULL');
    const settlement = sql.split('CREATE FUNCTION public.settle_checkout_payment')[1].split('CREATE OR REPLACE FUNCTION public.approve_failed_trip_refund')[0];
    expect(settlement.match(/session_\.provider_order_id IS DISTINCT FROM p_provider_order_id/g)).toHaveLength(2);
    expect(sql).toContain('p_payment_id !~');
    expect(sql).not.toContain("interval '20 minutes'");
  });
  it('restricts new privileged RPCs to service role', () => {
    for (const signature of ['claim_checkout_payment(uuid,text,uuid,text,text)', 'attach_checkout_provider_order(text,uuid,text,bigint,text)', 'settle_checkout_payment(uuid,uuid,text,bigint,text,text,text)']) {
      expect(sql).toContain(`public.${signature}`);
    }
    expect(sql).toContain('FROM PUBLIC,anon,authenticated');
    expect(sql).toContain('TO service_role');
  });
  it('does not automatically reclaim unknown provider-order creation', () => {
    const claim = sql.split('CREATE OR REPLACE FUNCTION public.claim_checkout_payment')[1].split('CREATE FUNCTION public.attach')[0];
    expect(claim).toContain('claimed:=found');
    expect(claim).not.toContain('claimed_at');
    expect(sql).toContain("Historical payment provider: refund through original provider");
    expect(sql).toContain('checkout_provider_order_unique');
  });
});
