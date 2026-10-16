import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn(), row: { id: 'shop', name: 'Shop', is_active: true, availability_override: true, payout_bank_account_number: '12345678', payout_upi_id: 'private@bank', pan_number: 'PRIVATE' } }));
vi.mock('../stores/access.js', () => ({ requireStoreAccess: mocks.access }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: mocks.rpc,
  from: vi.fn((table: string) => {
    const chain = { select: () => chain, eq: () => chain, neq: () => chain, order: () => chain,
      single: async () => ({ data: table === 'stores' ? mocks.row : { phone: null }, error: null }),
      maybeSingle: async () => ({ data: { phone: null }, error: null }),
      limit: async () => ({ data: [], error: null }),
    }; return chain;
  }),
} }));
import { partnerRouter } from './partner.js';
async function invoke(mode: unknown) {
  const handler = partnerRouter.stack.find(layer => layer.route?.path === '/store/availability')!.route!.stack.at(-1)!.handle as RequestHandler;
  const res = { json: vi.fn() } as unknown as Response; const next = vi.fn();
  await handler({ user: { id: 'operator' }, body: { mode } } as unknown as Request, res, next);
  return { res, error: next.mock.calls[0]?.[0] };
}
beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue({ storeId: 'shop', role: 'owner' }); mocks.rpc.mockResolvedValue({ error: null }); });
it('uses the server-owned store and authenticated operator for a manual override', async () => {
  const { error } = await invoke('open'); expect(error).toBeUndefined();
  expect(mocks.rpc).toHaveBeenCalledWith('partner_set_store_availability', { p_store: 'shop', p_user: 'operator', p_open: true });
});
it('clears the override when resuming automatic hours', async () => {
  expect((await invoke('auto')).error).toBeUndefined();
  expect(mocks.rpc).toHaveBeenCalledWith('partner_set_store_availability', { p_store: 'shop', p_user: 'operator', p_open: null });
});
it('rejects malformed modes and reports a failed database write', async () => {
  expect((await invoke('always-open')).error).toMatchObject({ status: 400 }); expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValue({ error: { code: 'P0409' } });
  expect((await invoke('open')).error).toMatchObject({ status: 409, code: 'STORE_SUSPENDED' });
});
it('allows a manager to toggle without returning private payout or KYC data', async () => {
  mocks.access.mockResolvedValue({ storeId: 'shop', role: 'manager' });
  const { res, error } = await invoke('closed'); expect(error).toBeUndefined();
  const body = vi.mocked(res.json).mock.calls[0]![0];
  expect(body).toMatchObject({ access_role: 'manager' });
  for (const key of ['payout_upi_id', 'payout_bank_account_number', 'pan_number']) expect(body).not.toHaveProperty(key);
});
