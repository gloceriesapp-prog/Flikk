import { expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

vi.mock('../db/supabase.js', () => ({ supabase: {
  from: () => {
    const builder = { select: () => builder, eq: () => builder, single: () => Promise.resolve({ data: { id: 'store-1' }, error: null }) };
    return builder;
  },
} }));
const rates = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../lib/platformSettings.js', () => ({ getStoreCommissionRate: rates.get }));
import { partnerRouter } from './partner.js';

const handler = partnerRouter.stack.find(l => l.route?.path === '/commission')!.route!.stack.at(-1)!.handle as RequestHandler;

it('returns the caller’s own store commission rate', async () => {
  rates.get.mockResolvedValue({ rate: 0.045, isStoreOverride: true });
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ user: { id: 'owner-1' } } as unknown as Request, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(rates.get).toHaveBeenCalledWith('store-1');
  expect(res.json).toHaveBeenCalledWith({ commissionRate: 0.045, isStoreOverride: true });
});
