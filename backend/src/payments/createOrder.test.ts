import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ from: vi.fn(), ensure: vi.fn(), retry: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: m.from } }));
vi.mock('./recovery.js', async load => ({ ...await load<typeof import('./recovery.js')>(), ensureProviderOrder: m.ensure, requirePaymentRetrySafe: m.retry }));
import { createOrder } from './createOrder.js';
const id = '00000000-0000-4000-8000-000000000100';
beforeEach(() => {
  vi.resetAllMocks(); m.ensure.mockResolvedValue({ id: 'order_one', amount: 12345 });
  const q = { select: vi.fn(() => q), eq: vi.fn(() => q), limit: vi.fn(() => q), maybeSingle: vi.fn(async () => ({ data: { reservation_expires_at: '2027-01-01T00:00:00Z' }, error: null })) }; m.from.mockReturnValue(q);
});
async function run(body: Record<string, unknown>) { const res = { json: vi.fn(), setHeader: vi.fn() }; const next = vi.fn(); await createOrder({ user: { id: 'customer' }, body } as never, res as never, next); return { res, next }; }
it('rejects old Cashfree binaries before creating a gateway order', async () => {
  for (const provider of [undefined, 'cashfree']) expect((await run({ orderId: id, provider })).next).toHaveBeenCalledWith(expect.objectContaining({ code: 'PAYMENT_APP_UPDATE_REQUIRED' }));
  expect(m.ensure).not.toHaveBeenCalled();
});
it('returns public SDK data only using provider amount, never client amount', async () => {
  const { res, next } = await run({ orderId: id, provider: 'razorpay', amount: 1 }); expect(next).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ provider: 'razorpay', providerOrderId: 'order_one', amount: 123.45, amountPaise: 12345, currency: 'INR', expiresAt: '2027-01-01T00:00:00.000Z' }));
  expect(JSON.stringify(res.json.mock.calls)).not.toContain('test-secret-key');
});
