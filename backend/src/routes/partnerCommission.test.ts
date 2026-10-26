import { expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

vi.mock('../db/supabase.js', () => ({ supabase: {
  from: () => {
    const builder = { select: () => builder, eq: () => builder, maybeSingle: () => Promise.resolve({ data: { id: 'store-1' }, error: null }), single: () => Promise.resolve({ data: { id: 'store-1' }, error: null }) };
    return builder;
  },
} }));
const rates = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../lib/commission.js', () => ({ getStoreCommissionCard: rates.get }));
import { partnerRouter } from './partner.js';

const handler = partnerRouter.stack.find(l => l.route?.path === '/commission')!.route!.stack.at(-1)!.handle as RequestHandler;

it('returns the caller’s own store commission rates', async () => {
  const card = { commissionRate: 0.04, isStoreOverride: false, capPerOrder: 30, categoryRates: [{ category: 'Dairy, Bread & Eggs', commissionRate: 0 }] };
  rates.get.mockResolvedValue(card);
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ user: { id: 'owner-1' } } as unknown as Request, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(rates.get).toHaveBeenCalledWith('store-1');
  expect(res.json).toHaveBeenCalledWith(card);
});
