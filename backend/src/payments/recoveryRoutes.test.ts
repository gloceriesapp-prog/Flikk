import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), provider: vi.fn(), payments: vi.fn(), settle: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: m.from, rpc: m.rpc } }));
vi.mock('./razorpayClient.js', async load => ({ ...await load<typeof import('./razorpayClient.js')>(), getProviderOrder: m.provider, getOrderPayments: m.payments }));
vi.mock('./settleCheckoutPayment.js', () => ({ settleCheckoutPayment: m.settle }));
import { getPaymentRecovery } from './recovery.js';
const id = '00000000-0000-4000-8000-000000000100';
let deadline: string;
beforeEach(() => {
  vi.resetAllMocks(); deadline = new Date(Date.now() + 600000).toISOString();
  m.rpc.mockResolvedValue({ data: { claimed: true }, error: null });
  m.provider.mockResolvedValue({ id: 'order_one', amount: 3000, currency: 'INR', receipt: 'gl_00000000000040008000000000000100', notes: { gloceries_order_id: id } });
  m.payments.mockResolvedValue([{ id: 'pay_one', order_id: 'order_one', currency: 'INR', amount: 3000, status: 'created', captured: false }]);
  m.from.mockImplementation(table => {
    const q = { select: vi.fn(() => q), eq: vi.fn(() => q), update: vi.fn(() => q),
      single: vi.fn(async () => ({ data: { id, total: 30, status: 'placed', payment_method: 'online', provider_payment_id: null, reservation_expires_at: deadline }, error: null })),
      maybeSingle: vi.fn(async () => ({ data: table === 'checkout_payment_sessions' ? { provider_order_id: 'order_one', payment_provider: 'razorpay', upi_state: 'ready', upi_payment_id: 'pay_one', upi_link: 'upi://pay?pa=merchant%40razorpay&tr=ref&am=30&cu=INR' } : null, error: null })) };
    return q;
  });
});
async function run() {
  const res = { json: vi.fn(), setHeader: vi.fn() }; const next = vi.fn();
  await getPaymentRecovery({ user: { id: 'customer' }, body: { orderId: id } } as never, res as never, next);
  return { res, next };
}
it('returns an explicitly verified resume flag for the existing pending UPI instruction', async () => {
  const { res, next } = await run(); expect(next).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'pending', canResumeUpiIntent: true }));
  expect(m.payments).toHaveBeenCalledTimes(1);
});
it('does not expose resume permission when provider authorization or checkout expiry prevents it', async () => {
  m.payments.mockResolvedValue([{ id: 'pay_one', order_id: 'order_one', currency: 'INR', amount: 3000, status: 'authorized', captured: false }]);
  expect((await run()).res.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'pending', canResumeUpiIntent: false }));
  m.payments.mockResolvedValue([{ id: 'pay_one', order_id: 'order_one', currency: 'INR', amount: 3000, status: 'created', captured: false }]);
  deadline = new Date(Date.now() - 60000).toISOString();
  expect((await run()).res.json).toHaveBeenCalledWith(expect.objectContaining({ canResumeUpiIntent: false }));
});
it('fails closed while another reconciliation lease owns the fresh provider read', async () => {
  m.rpc.mockResolvedValue({ data: { claimed: false, state: 'pending' }, error: null });
  expect((await run()).res.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'pending', canResumeUpiIntent: false }));
  expect(m.payments).not.toHaveBeenCalled();
});
