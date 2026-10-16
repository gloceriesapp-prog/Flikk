import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
import { DELETION_MARKER, deletionBlocker, deletionMessage, deletionReason, isDeletionTicket, sumCash } from '../lib/riderAccountDeletion.js';

const REQUEST_ID = '00000000-0000-4000-8000-000000000001';

const db = vi.hoisted(() => ({
  existing: null as Record<string, unknown> | null,
  activeOrders: 0,
  cash: [] as { amount: number | string }[],
  rpcResult: { data: 'ticket-1' as unknown, error: null as { code: string } | null },
  rpcCalls: [] as Record<string, unknown>[],
  riderUpdates: [] as Record<string, unknown>[],
}));

vi.mock('../db/supabase.js', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'support_tickets') {
        const builder = {
          select: () => builder, eq: () => builder, like: () => builder, order: () => builder, limit: () => builder,
          maybeSingle: () => Promise.resolve({ data: db.existing, error: null }),
        };
        return builder;
      }
      if (table === 'orders') {
        const builder = { select: () => builder, eq: () => builder, in: () => Promise.resolve({ count: db.activeOrders, error: null }) };
        return builder;
      }
      if (table === 'rider_cash_collections') {
        const builder = { select: () => builder, eq: () => builder, is: () => Promise.resolve({ data: db.cash, error: null }) };
        return builder;
      }
      if (table === 'riders') {
        return {
          update: (patch: Record<string, unknown>) => {
            db.riderUpdates.push(patch);
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      db.rpcCalls.push({ name, ...args });
      return Promise.resolve(db.rpcResult);
    },
  },
}));

import { riderAccountRouter } from './riderAccount.js';

function handlerFor(method: 'get' | 'post') {
  const layer = riderAccountRouter.stack.find((l) => l.route?.path === '/deletion-request' && (l.route as unknown as { methods: Record<string, boolean> }).methods[method]);
  return layer!.route!.stack.at(-1)!.handle as RequestHandler;
}

async function call(method: 'get' | 'post', body: Record<string, unknown> = {}) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis() } as unknown as Response;
  const next = vi.fn();
  await handlerFor(method)({ user: { id: 'rider-1', role: 'rider' }, body } as unknown as Request, res, next);
  return { res, err: next.mock.calls[0]?.[0] as { status?: number; code?: string; message?: string } | undefined };
}

beforeEach(() => {
  db.existing = null;
  db.activeOrders = 0;
  db.cash = [];
  db.rpcResult = { data: 'ticket-1', error: null };
  db.rpcCalls = [];
  db.riderUpdates = [];
});

describe('rider account deletion rules', () => {
  it('validates the optional reason', () => {
    expect(deletionReason(undefined)).toBe('');
    expect(deletionReason('  moving city  ')).toBe('moving city');
    expect(() => deletionReason(42)).toThrow('Reason must be text');
    expect(() => deletionReason('x'.repeat(501))).toThrow('under 500');
  });

  it('marks the ticket body so admin and the API can recognise it', () => {
    expect(deletionMessage('')).toMatch(new RegExp(`^\\${DELETION_MARKER}`));
    expect(deletionMessage('moving city')).toContain('Reason: moving city');
    expect(deletionMessage('').length).toBeGreaterThanOrEqual(10);
    expect(isDeletionTicket(deletionMessage(''))).toBe(true);
    expect(isDeletionTicket('My payout did not arrive')).toBe(false);
    expect(isDeletionTicket(null)).toBe(false);
  });

  it('blocks on active deliveries first, then on unsettled cash', () => {
    expect(deletionBlocker({ activeOrders: 1, outstandingCash: 200 })?.code).toBe('ACTIVE_DELIVERIES');
    const cash = deletionBlocker({ activeOrders: 0, outstandingCash: 1250.5 });
    expect(cash?.code).toBe('CASH_TO_SETTLE');
    expect(cash?.message).toContain('₹1,250.5');
    expect(deletionBlocker({ activeOrders: 0, outstandingCash: 0 })).toBeNull();
  });

  it('sums cash rows exactly, including numeric strings', () => {
    expect(sumCash([{ amount: '100.10' }, { amount: 0.2 }])).toBe(100.3);
    expect(sumCash([])).toBe(0);
  });
});

describe('POST /rider/account/deletion-request', () => {
  it('files a deletion ticket and takes the rider offline', async () => {
    const { res, err } = await call('post', { request_id: REQUEST_ID, reason: 'Moving city' });
    expect(err).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ id: 'ticket-1', status: 'open' });
    expect(db.rpcCalls[0]).toMatchObject({ name: 'create_staff_support_ticket', p_user_id: 'rider-1', p_request_id: REQUEST_ID, p_category: 'account', p_order_id: null });
    expect(isDeletionTicket(db.rpcCalls[0].p_message)).toBe(true);
    expect(db.riderUpdates).toEqual([{ status: 'offline' }]);
  });

  it('returns the open request instead of creating a duplicate', async () => {
    db.existing = { id: 'ticket-0', status: 'in_progress', created_at: 't', updated_at: 't', initial_message: deletionMessage('') };
    const { res, err } = await call('post', { request_id: REQUEST_ID });
    expect(err).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 'ticket-0', status: 'in_progress', created_at: 't', updated_at: 't' });
    expect(db.rpcCalls).toHaveLength(0);
  });

  it('allows a new request after an earlier one was resolved', async () => {
    db.existing = { id: 'ticket-0', status: 'resolved', created_at: 't', updated_at: 't', initial_message: deletionMessage('') };
    const { res } = await call('post', { request_id: REQUEST_ID });
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it('refuses while a delivery is active, without filing a ticket', async () => {
    db.activeOrders = 1;
    const { err } = await call('post', { request_id: REQUEST_ID });
    expect(err).toMatchObject({ status: 409, code: 'ACTIVE_DELIVERIES' });
    expect(db.rpcCalls).toHaveLength(0);
    expect(db.riderUpdates).toHaveLength(0);
  });

  it('refuses while collected cash is unsettled', async () => {
    db.cash = [{ amount: '420' }];
    const { err } = await call('post', { request_id: REQUEST_ID });
    expect(err).toMatchObject({ status: 409, code: 'CASH_TO_SETTLE' });
  });

  it('explains a clash with another open account ticket', async () => {
    db.rpcResult = { data: null, error: { code: '23505' } };
    const { err } = await call('post', { request_id: REQUEST_ID });
    expect(err).toMatchObject({ status: 409, code: 'ACCOUNT_TICKET_OPEN' });
    expect(db.riderUpdates).toHaveLength(0);
  });

  it('rejects a missing or malformed request id', async () => {
    const { err } = await call('post', { request_id: 'nope' });
    expect(err).toMatchObject({ status: 400, code: 'INVALID_ID' });
  });
});

describe('GET /rider/account/deletion-request', () => {
  it('returns null when there is no request and never caches', async () => {
    const { res } = await call('get');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(res.json).toHaveBeenCalledWith(null);
  });

  it('ignores account tickets that are not deletion requests', async () => {
    db.existing = { id: 'ticket-9', status: 'open', created_at: 't', updated_at: 't', initial_message: 'Please update my phone number' };
    const { res } = await call('get');
    expect(res.json).toHaveBeenCalledWith(null);
  });
});
