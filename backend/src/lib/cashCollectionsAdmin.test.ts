import { beforeEach, describe, expect, it, vi } from 'vitest';

const RIDER = '00000000-0000-4000-8000-0000000008e1';
const COLLECTION = '00000000-0000-4000-8000-0000000008c9';
const mocks = vi.hoisted(() => ({
  user: { id: 'admin-user', email: 'nishalpoojary810@gmail.com' } as { id: string; email: string } | null,
  rpc: vi.fn(),
  tables: {} as Record<string, unknown[]>,
}));
vi.mock('@/lib/supabase/server', () => ({ requireAdminSession: async () => mocks.user }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {
  rpc: mocks.rpc,
  from: (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const name of ['select', 'is', 'in', 'order', 'limit', 'eq']) builder[name] = () => builder;
    builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: mocks.tables[table] ?? [], error: null });
    return builder;
  },
} }));
import { GET } from '../../../apps/admin/src/app/api/cash-collections/route';
import { POST } from '../../../apps/admin/src/app/api/cash-collections/settle/route';

const settle = (body: unknown) => POST(new Request('http://localhost/api/cash-collections/settle', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));

beforeEach(() => {
  mocks.user = { id: 'admin-user', email: 'nishalpoojary810@gmail.com' };
  mocks.rpc.mockReset();
  mocks.tables = {};
});

describe('admin cash on delivery routes', () => {
  it('require the admin before reading or settling', async () => {
    mocks.user = null;
    expect((await GET(new Request('http://localhost/api/cash-collections'))).status).toBe(401);
    expect((await settle({ riderId: RIDER })).status).toBe(401);
    mocks.user = { id: 'someone', email: 'someone@example.com' };
    expect((await settle({ riderId: RIDER })).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('lists outstanding cash per rider with the collections behind it', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ rider_id: RIDER, outstanding_amount: '250.00', outstanding_count: 2, oldest_collected_at: '2026-10-07T08:00:00Z' }], error: null });
    mocks.tables.rider_cash_collections = [
      { id: COLLECTION, rider_id: RIDER, order_id: 'o1', trip_id: null, amount: '200.00', collected_at: '2026-10-07T08:00:00Z', settled_at: null, settlement_ref: null },
    ];
    mocks.tables.riders = [{ user_id: RIDER, name: 'Ravi', phone: '+919000000002' }];
    mocks.tables.orders = [{ id: 'o1', order_number: 'FLK-1001' }];
    const response = await GET(new Request('http://localhost/api/cash-collections'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(mocks.rpc).toHaveBeenCalledWith('rider_cash_outstanding');
    expect(body.riders).toEqual([{ riderId: RIDER, riderName: 'Ravi', riderPhone: '+919000000002', outstandingAmount: 250,
      outstandingCount: 2, oldestCollectedAt: '2026-10-07T08:00:00Z', outstandingIds: [COLLECTION] }]);
    expect(body.collections[0]).toMatchObject({ id: COLLECTION, riderName: 'Ravi', orderLabel: 'FLK-1001', amount: 200, isTrip: false, settledAt: null });
  });

  it.each([
    [{}, 'Choose a rider.'],
    [{ riderId: 'not-a-uuid' }, 'Choose a rider.'],
    [{ riderId: RIDER, reference: 5 }, 'Reference must be text.'],
    [{ riderId: RIDER, reference: 'x'.repeat(201) }, 'Keep the reference under 200 characters.'],
    [{ riderId: RIDER, collectionIds: [] }, 'Choose the collections to settle.'],
    [{ riderId: RIDER, collectionIds: ['bad'] }, 'Choose the collections to settle.'],
  ])('rejects invalid settlement input %j', async (body, error) => {
    const response = await settle(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('settles through the RPC as the signed-in admin', async () => {
    mocks.rpc.mockResolvedValue({ data: { settled_count: 1, settled_amount: '200.00' }, error: null });
    const response = await settle({ riderId: RIDER, reference: '  RCPT-1 ', collectionIds: [COLLECTION] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ settledCount: 1, settledAmount: 200 });
    expect(mocks.rpc).toHaveBeenCalledWith('settle_rider_cash', { p_rider: RIDER, p_admin: 'admin-user', p_reference: 'RCPT-1', p_collections: [COLLECTION] });
  });

  it('settles everything when no ids are given and hides database errors', async () => {
    mocks.rpc.mockResolvedValue({ data: { settled_count: 0, settled_amount: 0 }, error: null });
    expect((await settle({ riderId: RIDER })).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('settle_rider_cash', { p_rider: RIDER, p_admin: 'admin-user', p_reference: null, p_collections: null });
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'private database details' } });
    const response = await settle({ riderId: RIDER });
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('private');
  });
});
