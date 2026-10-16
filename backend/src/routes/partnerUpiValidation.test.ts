import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const mocks = vi.hoisted(() => ({ access: vi.fn(), validate: vi.fn() }));
vi.mock('../stores/access.js', () => ({ requireStoreAccess: mocks.access }));
vi.mock('../payouts/upiValidation.js', () => ({ validatePartnerUpi: mocks.validate }));
import { partnerRouter } from './partner.js';
const route = () => partnerRouter.stack.find(layer => layer.route?.path === '/payout-account/validate-upi')!.route!;
async function request() {
  const res = { json: vi.fn(), set: vi.fn() } as unknown as Response;
  const next = vi.fn();
  const handler = route().stack.at(-1)!.handle as RequestHandler;
  await handler({ user: { id: 'owner' }, body: { upiId: 'person@bank' } } as unknown as Request, res, next);
  return { res, next };
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.access.mockResolvedValue({ role: 'owner', storeId: 'store' });
  mocks.validate.mockResolvedValue({ upiId: 'person@bank', valid: true, registeredName: 'Person Name' });
});
it('requires an owner, a durable budget and non-cacheable responses', async () => {
  const { res, next } = await request();
  expect(mocks.access).toHaveBeenCalledWith('owner');
  expect(mocks.validate).toHaveBeenCalledWith('owner', { upiId: 'person@bank' });
  expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  expect(next).not.toHaveBeenCalled(); expect(route().stack.length).toBe(2);
});
it('denies a manager before calling Razorpay', async () => {
  mocks.access.mockResolvedValue({ role: 'manager', storeId: 'store' });
  const { next } = await request();
  expect(next.mock.calls[0]?.[0]).toMatchObject({ status: 403, code: 'OWNER_REQUIRED' });
  expect(mocks.validate).not.toHaveBeenCalled();
});
it('propagates provider failure without returning success', async () => {
  mocks.validate.mockRejectedValue(new Error('unavailable'));
  const { res, next } = await request();
  expect(res.json).not.toHaveBeenCalled(); expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
});
