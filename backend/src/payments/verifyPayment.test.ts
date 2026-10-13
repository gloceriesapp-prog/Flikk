import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ from: vi.fn(), recover: vi.fn(), reconcile: vi.fn(), signature: vi.fn(), validate: vi.fn(), settle: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: m.from } }));
vi.mock('./recovery.js', async load => ({ ...await load<typeof import('./recovery.js')>(), recoverProviderOrder: m.recover, reconcileProvider: m.reconcile }));
vi.mock('./razorpayClient.js', async load => ({ ...await load<typeof import('./razorpayClient.js')>(), verifyCheckoutSignature: m.signature }));
vi.mock('./validateCapturedPayment.js', () => ({ validateCapturedPayment: m.validate }));
vi.mock('./settleCheckoutPayment.js', () => ({ settleCheckoutPayment: m.settle }));
import { verifyPayment } from './verifyPayment.js';
const id = '00000000-0000-4000-8000-000000000100';
let owner = 'customer';
beforeEach(() => {
  vi.resetAllMocks(); owner = 'customer';
  const q = { select: vi.fn(() => q), eq: vi.fn(() => q), maybeSingle: vi.fn(async () => ({ data: { id, customer_id: owner, total: 30, payment_provider: 'razorpay' }, error: null })) };
  m.from.mockReturnValue(q); m.recover.mockResolvedValue({ id: 'order_one' }); m.reconcile.mockResolvedValue('paid'); m.signature.mockReturnValue(true); m.validate.mockResolvedValue(3000); m.settle.mockResolvedValue(true);
});
async function run(extra: Record<string, unknown> = {}) {
  const res = { json: vi.fn(), setHeader: vi.fn() }; const next = vi.fn();
  await verifyPayment({ user: { id: 'customer' }, body: { orderId: id, ...extra } } as never, res as never, next);
  return { res, next };
}
it('accepts SDK signature only after server order lookup then verifies captured money', async () => {
  const { res, next } = await run({ razorpay_order_id: 'order_one', razorpay_payment_id: 'pay_one', razorpay_signature: 'signed' });
  expect(next).not.toHaveBeenCalled(); expect(m.signature).toHaveBeenCalledWith('order_one', 'pay_one', 'signed');
  expect(m.validate).toHaveBeenCalledWith({ orderId: id }, 'pay_one', 'order_one'); expect(m.settle).toHaveBeenCalledWith({ orderId: id }, 'pay_one', 3000, 'INR', 'order_one');
  expect(res.json).toHaveBeenCalledWith({ ok: true, state: 'paid' });
});
it('rejects partial SDK data, wrong checkout and forged signature before settlement', async () => {
  for (const input of [{ razorpay_payment_id: 'pay_one' }, { razorpay_order_id: 'order_other', razorpay_payment_id: 'pay_one', razorpay_signature: 'signed' }]) {
    expect((await run(input)).next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_PAYMENT_SIGNATURE' }));
  }
  m.signature.mockReturnValue(false); expect((await run({ razorpay_order_id: 'order_one', razorpay_payment_id: 'pay_one', razorpay_signature: 'forged' })).next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_PAYMENT_SIGNATURE' }));
  expect(m.validate).not.toHaveBeenCalled(); expect(m.settle).not.toHaveBeenCalled();
});
it('recovers without navigation signature only by reading server provider state', async () => {
  await run(); expect(m.signature).not.toHaveBeenCalled(); expect(m.reconcile).toHaveBeenCalledWith(expect.anything(), 'order_one', 30);
});
it('rejects another customer before provider reads and preserves pending state', async () => {
  owner = 'other'; expect((await run()).next).toHaveBeenCalledWith(expect.objectContaining({ code: 'FORBIDDEN' })); expect(m.recover).not.toHaveBeenCalled();
  owner = 'customer'; m.reconcile.mockResolvedValue('pending'); expect((await run()).res.json).toHaveBeenCalledWith({ ok: false, state: 'pending' });
});
