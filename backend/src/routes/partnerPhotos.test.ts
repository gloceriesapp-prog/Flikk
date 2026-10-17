import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const m = vi.hoisted(() => ({ role: 'owner', error: null as { code: string } | null, missing: false, lookups: [] as Record<string, unknown>[] }));
vi.mock('../stores/access.js', () => ({ requireStoreAccess: async () => ({ role: m.role, storeId: 'store' }) }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: async () => ({ error: null }),
  from(table: string) {
    const filters: Record<string, unknown> = {};
    const result = () => {
      if (table === 'stores') return { data: { id: 'store', address_line: 'Address', profile_photo_path: 'owner.enc', store_doc_path: 'store.enc', aadhaar_photo_path: null }, error: null };
      if (table === 'users') return { data: { phone: null }, error: null };
      if (table === 'store_profile_change_requests') return { data: [], error: null };
      if (table === 'media_assets') {
        m.lookups.push({ ...filters });
        return { data: m.missing && filters.object_key === 'owner.enc' ? null : { id: filters.object_key === 'owner.enc' ? 'owner-photo' : 'store-photo' }, error: m.error };
      }
      throw new Error(`Unexpected table ${table}`);
    };
    const q = {
      select: () => q, update: () => q, order: () => q, limit: () => q, neq: () => q,
      eq: (key: string, value: unknown) => { filters[key] = value; return q; },
      single: async () => result(), maybeSingle: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return q;
  },
} }));
import { partnerRouter } from './partner.js';
async function request(method: string, path: string) {
  const layer = partnerRouter.stack.find(l => l.route?.path === path && (l.route as unknown as { methods: Record<string, boolean> }).methods[method]);
  const handler = layer!.route!.stack.at(-1)!.handle as RequestHandler;
  const json = vi.fn(); const next = vi.fn();
  await handler({ user: { id: 'owner' }, body: path.endsWith('/availability') ? { mode: 'auto' } : {} } as unknown as Request, { json } as unknown as Response, next);
  return { data: json.mock.calls[0]?.[0], next };
}
beforeEach(() => { m.role = 'owner'; m.lookups = []; m.error = null; m.missing = false; });
it.each([['get', '/store'], ['patch', '/store'], ['patch', '/store/availability']])('%s %s retains both photos in the authoritative profile', async (method, path) => {
  const { data, next } = await request(method, path);
  expect(next).not.toHaveBeenCalled();
  expect(data).toMatchObject({ profilePhotoUrl: '/partner/documents/owner-photo', storePhotoUrl: '/partner/documents/store-photo' });
  expect(data).not.toHaveProperty('profile_photo_path'); expect(data).not.toHaveProperty('store_doc_path');
  expect(m.lookups).toHaveLength(2);
  for (const lookup of m.lookups) expect(lookup).toMatchObject({ uploaded_by: 'owner', bucket: 'store-documents', status: 'ready' });
});
it.each([['get', '/store'], ['patch', '/store/availability']])('does not resolve owner photos for manager %s %s', async (method, path) => {
  m.role = 'manager'; const { data, next } = await request(method, path);
  expect(next).not.toHaveBeenCalled(); expect(data).toMatchObject({ profilePhotoUrl: null, storePhotoUrl: null }); expect(m.lookups).toEqual([]);
});
it('returns the store photo when the owner photo is missing', async () => {
  m.missing = true; const { data } = await request('get', '/store');
  expect(data).toMatchObject({ profilePhotoUrl: null, storePhotoUrl: '/partner/documents/store-photo' });
});
it('preserves cached profile state by failing instead of reporting missing photos on a database outage', async () => {
  m.error = { code: '08006' }; const { data, next } = await request('get', '/store');
  expect(data).toBeUndefined(); expect(next).toHaveBeenCalledWith(m.error);
});
