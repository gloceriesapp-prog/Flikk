import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), claim: vi.fn(), razorpay: vi.fn(), recover: vi.fn(), create: vi.fn(), session: { value: null as null | { payment_provider: string } } }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: m.from, rpc: m.rpc } }));
vi.mock('./recovery.js', async load => ({ ...await load<typeof import('./recovery.js')>(), claimPayment: m.claim, razorpayOrderFor: m.razorpay }));
vi.mock('./cashfreeCheckout.js', () => ({ recoverCashfreeOrder: m.recover, createCashfreeOrder: m.create }));
import { ensureCheckoutOrder, parseGatewaySetting, pickGateway, splitBucket } from './gateway.js';
import { CashfreeError } from './cashfreeClient.js';
import { AppError } from '../lib/errors.js';
import { paymentTarget } from './recovery.js';

const id = '00000000-0000-4000-8000-000000000100';
const target = paymentTarget({ orderId: id });
const cashfreeOnly = { mode: 'cashfree' as const, splitPercent: 0 };
beforeEach(() => {
  vi.resetAllMocks(); m.session.value = null;
  const q = { select: vi.fn(() => q), eq: vi.fn(() => q), maybeSingle: vi.fn(async () => ({ data: m.session.value, error: null })) };
  m.from.mockReturnValue(q);
  m.claim.mockImplementation(async (_t, _c, _mode, provider) => ({ session: { payment_provider: provider, provider_order_id: null }, claimed: true, total: 10 }));
  m.razorpay.mockResolvedValue({ id: 'order_one', amount: 1000 });
  m.recover.mockResolvedValue(undefined);
  m.create.mockResolvedValue({ id: 'gl_x', amount: 1000, paymentSessionId: 'session_one' });
  m.rpc.mockResolvedValue({ data: {}, error: null });
});

it('parses the admin setting and defaults to razorpay', () => {
  expect(parseGatewaySetting(null)).toEqual({ mode: 'razorpay', splitPercent: 0 });
  expect(parseGatewaySetting({ payment_gateway: 'split', payment_gateway_split_pct: 10 })).toEqual({ mode: 'split', splitPercent: 10 });
  expect(parseGatewaySetting({ payment_gateway: 'stripe', payment_gateway_split_pct: 250 })).toEqual({ mode: 'razorpay', splitPercent: 0 });
});
it('selects the provider from the setting, and razorpay when Cashfree is not configured', () => {
  expect(pickGateway({ mode: 'razorpay', splitPercent: 100 }, id, true)).toBe('razorpay');
  expect(pickGateway(cashfreeOnly, id, true)).toBe('cashfree');
  expect(pickGateway(cashfreeOnly, id, false)).toBe('razorpay');
  expect(pickGateway({ mode: 'split', splitPercent: 0 }, id, true)).toBe('razorpay');
  expect(pickGateway({ mode: 'split', splitPercent: 100 }, id, true)).toBe('cashfree');
});
it('splits by a stable per-checkout hash close to the configured percent', () => {
  const ids = Array.from({ length: 4000 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
  const share = ids.filter(value => pickGateway({ mode: 'split', splitPercent: 10 }, value, true) === 'cashfree').length / ids.length;
  expect(share).toBeGreaterThan(0.08); expect(share).toBeLessThan(0.12);
  expect(splitBucket(id)).toBe(splitBucket(id));
});
it('old builds always get razorpay, even when the setting says cashfree', async () => {
  const result = await ensureCheckoutOrder(target, 'customer', false, new Date(), cashfreeOnly);
  expect(result.provider).toBe('razorpay');
  expect(m.claim).toHaveBeenCalledWith(target, 'customer', 'order', 'razorpay');
});
it('an existing checkout keeps its provider', async () => {
  m.session.value = { payment_provider: 'razorpay' };
  expect((await ensureCheckoutOrder(target, 'customer', true, new Date(), cashfreeOnly)).provider).toBe('razorpay');
  m.session.value = { payment_provider: 'cashfree' };
  await expect(ensureCheckoutOrder(target, 'customer', false, new Date())).rejects.toMatchObject({ code: 'PAYMENT_APP_UPDATE_REQUIRED' });
});
it('creates a Cashfree order and returns its session', async () => {
  const result = await ensureCheckoutOrder(target, 'customer', true, new Date(), cashfreeOnly);
  expect(result).toEqual({ provider: 'cashfree', order: { id: 'gl_x', amount: 1000, paymentSessionId: 'session_one' } });
  expect(m.rpc).not.toHaveBeenCalled();
});
it('falls back to razorpay once when Cashfree order creation fails', async () => {
  m.create.mockRejectedValue(new CashfreeError(0));
  const result = await ensureCheckoutOrder(target, 'customer', true, new Date(), cashfreeOnly);
  expect(result.provider).toBe('razorpay');
  expect(m.rpc).toHaveBeenCalledWith('switch_checkout_provider', { p_kind: 'order', p_target_id: id, p_from: 'cashfree', p_to: 'razorpay' });
  expect(m.razorpay).toHaveBeenCalledTimes(1);
});
it('never falls back when the switch is refused (already attached or already fell back)', async () => {
  m.create.mockRejectedValue(new CashfreeError(500));
  m.rpc.mockResolvedValue({ data: null, error: { message: 'Checkout cannot switch provider' } });
  await expect(ensureCheckoutOrder(target, 'customer', true, new Date(), cashfreeOnly)).rejects.toBeInstanceOf(CashfreeError);
  expect(m.razorpay).not.toHaveBeenCalled();
});
it('does not fall back on review/database errors', async () => {
  m.create.mockRejectedValue(new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'x'));
  await expect(ensureCheckoutOrder(target, 'customer', true, new Date(), cashfreeOnly)).rejects.toMatchObject({ code: 'PAYMENT_REVIEW_REQUIRED' });
  expect(m.rpc).not.toHaveBeenCalled();
});
it('a retry that lost the first claim never creates a second provider order', async () => {
  m.claim.mockResolvedValue({ session: { payment_provider: 'cashfree' }, claimed: false, total: 10 });
  await expect(ensureCheckoutOrder(target, 'customer', true, new Date(), cashfreeOnly)).rejects.toMatchObject({ code: 'PAYMENT_RECONCILING' });
  expect(m.create).not.toHaveBeenCalled();
});
