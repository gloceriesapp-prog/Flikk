import { beforeEach, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ authorized: true, fail: false, filters: [] as [string, unknown][], count: 2 }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => fixture.authorized
  ? { actor: { id: 'admin' }, denied: null }
  : { denied: new Response(null, { status: 401 }) } }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {
  rpc: vi.fn(async () => ({ data: { pendingStoreApplications: 3 }, error: null })),
  from: vi.fn(() => {
    const result = () => ({ data: [{ id: 'request', store_id: 'store', stores: { name: 'Neighbourhood shop' }, changes: { name: 'Requested name' }, previous: { name: 'Live name' }, status: 'pending', created_at: '2026-10-15T10:00:00Z', reviewed_at: null, review_reason: null }], count: fixture.count, error: fixture.fail ? new Error('Unavailable') : null });
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { fixture.filters.push([key, value]); return query; },
      neq: (key: string, value: unknown) => { fixture.filters.push([key, value]); return query; },
      order: () => query,
      limit: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  }),
} }));

import { GET as getChanges } from '../../../apps/admin/src/app/api/store-changes/route';
import { GET as getAttention } from '../../../apps/admin/src/app/api/attention/route';
import { supabaseAdmin } from '../../../apps/admin/src/lib/supabase/admin';

beforeEach(() => { fixture.authorized = true; fixture.fail = false; fixture.filters = []; vi.clearAllMocks(); });
it('protects the private queue and its badge before database reads', async () => {
  fixture.authorized = false;
  expect((await getChanges(new Request('https://admin.test/api/store-changes'))).status).toBe(401);
  expect((await getAttention()).status).toBe(401);
  expect(supabaseAdmin.from).not.toHaveBeenCalled();
  expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
});
it('returns pending partner proposals separately from live values and disables caching', async () => {
  const response = await getChanges(new Request('https://admin.test/api/store-changes'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(fixture.filters).toContainEqual(['status', 'pending']);
  expect(await response.json()).toMatchObject([{ storeName: 'Neighbourhood shop', changes: { name: 'Requested name' }, previous: { name: 'Live name' } }]);
});
it('includes store update requests in the approvals badge total', async () => {
  const response = await getAttention();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.total).toBe(5);
  expect(body.items).toContainEqual({ key: 'pendingStoreUpdates', label: 'Partner store updates to review', href: '/approvals', count: 2 });
});
it('reports a queue count failure instead of claiming no approvals are pending', async () => {
  fixture.fail = true;
  expect((await getAttention()).status).toBe(500);
});
