import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
import { DELETION_MARKER, deletionBlocker, deletionMessage, deletionReason, isDeletionTicket } from '../lib/partnerAccountDeletion.js';
import { deletionMessage as riderDeletionMessage } from '../lib/riderAccountDeletion.js';

const REQUEST_ID = '00000000-0000-4000-8000-000000000001';

const db = vi.hoisted(() => ({
  existing: null as Record<string, unknown> | null,
  ownedStore: { id: 'store-1' } as { id: string } | null,
  activeOrders: 0,
  ticketFilters: [] as [string, unknown][],
  orderFilters: [] as [string, unknown][],
  rpcResult: { data: 'ticket-1' as unknown, error: null as { code: string } | null },
  rpcCalls: [] as Record<string, unknown>[],
  storeUpdates: [] as { patch: Record<string, unknown>; id: unknown }[],
}));

vi.mock('../db/supabase.js', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'support_tickets') {
        const builder = {
          select: () => builder,
          eq: (column: string, value: unknown) => { db.ticketFilters.push([column, value]); return builder; },
          like: () => builder, order: () => builder, limit: () => builder,
          maybeSingle: () => Promise.resolve({ data: db.existing, error: null }),
        };
        return builder;
      }
      if (table === 'orders') {
        const builder = {
          select: () => builder,
          eq: (column: string, value: unknown) => { db.orderFilters.push([column, value]); return builder; },
          in: () => Promise.resolve({ count: db.activeOrders, error: null }),
        };
        return builder;
      }
      if (table === 'stores') {
        const builder = {
          select: () => builder, eq: () => builder,
          maybeSingle: () => Promise.resolve({ data: db.ownedStore, error: null }),
          update: (patch: Record<string, unknown>) => ({
            eq: (_column: string, id: unknown) => {
              db.storeUpdates.push({ patch, id });
              return Promise.resolve({ error: null });
            },
          }),
        };
        return builder;
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      db.rpcCalls.push({ name, ...args });
      return Promise.resolve(db.rpcResult);
    },
  },
}));

import { partnerAccountRouter } from './partnerAccount.js';

function handlerFor(method: 'get' | 'post') {
  const layer = partnerAccountRouter.stack.find((l) => l.route?.path === '/deletion-request' && (l.route as unknown as { methods: Record<string, boolean> }).methods[method]);
  return layer!.route!.stack.at(-1)!.handle as RequestHandler;
}

async function call(method: 'get' | 'post', body: Record<string, unknown> = {}) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis() } as unknown as Response;
  const next = vi.fn();
  await handlerFor(method)({ user: { id: 'owner-1', role: 'store_owner' }, body } as unknown as Request, res, next);
  return { res, err: next.mock.calls[0]?.[0] as { status?: number; code?: string; message?: string } | undefined };
}

beforeEach(() => {
  db.existing = null;
  db.ownedStore = { id: 'store-1' };
  db.activeOrders = 0;
  db.ticketFilters = [];
  db.orderFilters = [];
  db.rpcResult = { data: 'ticket-1', error: null };
  db.rpcCalls = [];
  db.storeUpdates = [];
});

describe('partner account deletion rules', () => {
  it('validates the optional reason', () => {
    expect(deletionReason(undefined)).toBe('');
    expect(deletionReason('  closing the shop  ')).toBe('closing the shop');
    expect(() => deletionReason(42)).toThrow('Reason must be text');
    expect(() => deletionReason('x'.repeat(501))).toThrow('under 500');
  });

  it('marks the ticket body with the shared marker and a partner sentence', () => {
    expect(deletionMessage('')).toMatch(new RegExp(`^\\${DELETION_MARKER}`));
    expect(deletionMessage('')).toContain('store partner');
    expect(deletionMessage('')).not.toEqual(riderDeletionMessage(''));
    expect(deletionMessage('closing the shop')).toContain('Reason: closing the shop');
    expect(isDeletionTicket(deletionMessage(''))).toBe(true);
    expect(isDeletionTicket('My payout did not arrive')).toBe(false);
  });

  it('blocks while the store has active orders', () => {
    expect(deletionBlocker({ activeOrders: 1 })?.message).toContain('1 active order.');
    expect(deletionBlocker({ activeOrders: 3 })).toMatchObject({ status: 409, code: 'ACTIVE_ORDERS' });
    expect(deletionBlocker({ activeOrders: 0 })).toBeNull();
  });
});

describe('POST /partner/account/deletion-request', () => {
  it('files a deletion ticket and closes the owned store', async () => {
    const { res, err } = await call('post', { request_id: REQUEST_ID, reason: 'Closing the shop' });
    expect(err).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ id: 'ticket-1', status: 'open' });
    expect(db.rpcCalls[0]).toMatchObject({ name: 'create_staff_support_ticket', p_user_id: 'owner-1', p_request_id: REQUEST_ID, p_category: 'account', p_order_id: null });
    expect(isDeletionTicket(db.rpcCalls[0].p_message)).toBe(true);
    expect(db.ticketFilters).toContainEqual(['requester_role', 'store_owner']);
    expect(db.orderFilters).toContainEqual(['store_id', 'store-1']);
    expect(db.storeUpdates).toEqual([{ patch: { is_active: false }, id: 'store-1' }]);
  });

  it('files a ticket without touching any store for a non-owner (manager)', async () => {
    db.ownedStore = null;
    const { res, err } = await call('post', { request_id: REQUEST_ID });
    expect(err).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(202);
    expect(db.orderFilters).toHaveLength(0);
    expect(db.storeUpdates).toHaveLength(0);
  });

  it('returns the open request instead of creating a duplicate', async () => {
    db.existing = { id: 'ticket-0', status: 'in_progress', created_at: 't', updated_at: 't', initial_message: deletionMessage('') };
    const { res, err } = await call('post', { request_id: REQUEST_ID });
    expect(err).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 'ticket-0', status: 'in_progress', created_at: 't', updated_at: 't' });
    expect(db.rpcCalls).toHaveLength(0);
    expect(db.storeUpdates).toHaveLength(0);
  });

  it('allows a new request after an earlier one was resolved', async () => {
    db.existing = { id: 'ticket-0', status: 'resolved', created_at: 't', updated_at: 't', initial_message: deletionMessage('') };
    const { res } = await call('post', { request_id: REQUEST_ID });
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it('refuses while the store has active orders, without filing a ticket or closing', async () => {
    db.activeOrders = 2;
    const { err } = await call('post', { request_id: REQUEST_ID });
    expect(err).toMatchObject({ status: 409, code: 'ACTIVE_ORDERS' });
    expect(err?.message).toContain('2 active orders');
    expect(db.rpcCalls).toHaveLength(0);
    expect(db.storeUpdates).toHaveLength(0);
  });

  it('explains a clash with another open account ticket', async () => {
    db.rpcResult = { data: null, error: { code: '23505' } };
    const { err } = await call('post', { request_id: REQUEST_ID });
    expect(err).toMatchObject({ status: 409, code: 'ACCOUNT_TICKET_OPEN' });
    expect(db.storeUpdates).toHaveLength(0);
  });

  it('rejects a missing or malformed request id', async () => {
    const { err } = await call('post', { request_id: 'nope' });
    expect(err).toMatchObject({ status: 400, code: 'INVALID_ID' });
    expect(db.rpcCalls).toHaveLength(0);
  });
});

describe('GET /partner/account/deletion-request', () => {
  it('returns null when there is no request and never caches', async () => {
    const { res } = await call('get');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(res.json).toHaveBeenCalledWith(null);
  });

  it('returns the latest deletion request', async () => {
    db.existing = { id: 'ticket-3', status: 'open', created_at: 't', updated_at: 'u', initial_message: deletionMessage('bye') };
    const { res } = await call('get');
    expect(res.json).toHaveBeenCalledWith({ id: 'ticket-3', status: 'open', created_at: 't', updated_at: 'u' });
  });

  it('ignores account tickets that are not deletion requests', async () => {
    db.existing = { id: 'ticket-9', status: 'open', created_at: 't', updated_at: 't', initial_message: 'Please update my phone number' };
    const { res } = await call('get');
    expect(res.json).toHaveBeenCalledWith(null);
  });
});
