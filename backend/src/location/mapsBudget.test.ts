import { beforeEach, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('../db/supabase.js', () => ({ supabase: { rpc } }));
import { mapsBudget } from '../customer-experience/mapsBudget.js';
async function check(kind: 'client' | 'provider') {
 const res = { set: vi.fn() }; const next = vi.fn();
 await mapsBudget(kind)({ ip: '192.0.2.1', socket: {} } as Request, res as unknown as Response, next as NextFunction);
 return { res, next };
}
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: 0, error: null }); vi.unstubAllEnvs(); });
it('uses keyed anonymous subjects and admits with a replica-shared budget', async () => {
 const { next } = await check('client'); expect(next).toHaveBeenCalledWith();
 const args = rpc.mock.calls[0][1]; expect(args.p_buckets[0]).toEqual({ key: expect.stringMatching(/^[a-f0-9]{64}$/), limit: 90 });
 expect(JSON.stringify(args)).not.toContain('192.0.2.1');
});
it('returns retry time for exhausted provider quota', async () => {
 rpc.mockResolvedValue({ data: 17, error: null }); const { res, next } = await check('provider');
 expect(res.set).toHaveBeenCalledWith('Retry-After', '17'); expect(next.mock.calls[0][0]).toMatchObject({ status: 429, code: 'LOCATION_RATE_LIMITED' });
});
it('fails closed on missing or malformed budget results', async () => {
 for (const result of [{ data: null, error: new Error('offline') }, { data: null, error: null }, { data: -1, error: null }]) {
  rpc.mockResolvedValue(result); const { next } = await check('client'); expect(next.mock.calls[0][0]).toMatchObject({ status: 503 });
 }
});
it('does not call the provider with invalid quota configuration', async () => {
 vi.stubEnv('MAPS_PROVIDER_REQUESTS_PER_MINUTE', 'Infinity'); const { next } = await check('provider');
 expect(next.mock.calls[0][0]).toMatchObject({ status: 503 }); expect(rpc).not.toHaveBeenCalled();
});
