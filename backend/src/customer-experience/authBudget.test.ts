import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: (...a: unknown[]) => mocks.rpc(...a) } }));
vi.mock('../lib/logger.js', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { authBudget } from './authBudget.js';
import { AppError } from '../lib/errors.js';

type Action = 'send' | 'verify' | 'refresh';
function run(action: Action, ip: string, phone = '7975247012') {
  const req = { ip, socket: { remoteAddress: ip }, body: { phone } } as never;
  const res = { set: vi.fn() } as never;
  return new Promise<unknown>((resolve) => {
    authBudget(action)(req, res, ((err?: unknown) => resolve(err)) as never);
  });
}

beforeEach(() => vi.clearAllMocks());

it('allows the request when the budget RPC returns 0', async () => {
  mocks.rpc.mockResolvedValue({ data: 0, error: null });
  expect(await run('verify', '1.0.0.1', '9000000001')).toBeUndefined();
});

it('rate-limits with 429 when the RPC returns a positive wait', async () => {
  mocks.rpc.mockResolvedValue({ data: 9, error: null });
  const err = await run('verify', '1.0.0.2', '9000000002');
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).status).toBe(429);
});

it('does NOT 503 when the budget RPC errors — degrades to the in-process limiter', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'function claim_auth_budget does not exist' } });
  // Fresh IP+phone: first hit must be allowed by the fallback, never a 503.
  expect(await run('verify', '1.0.0.3', '9000000003')).toBeUndefined();
});

it('the fallback still bounds abuse: sustained hits during an RPC outage eventually 429', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
  let last: unknown;
  for (let i = 0; i < 130; i++) last = await run('verify', '1.0.0.4', '9000000004');
  expect(last).toBeInstanceOf(AppError);
  expect((last as AppError).status).toBe(429);
});
