import { beforeEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ owner: null as null | { id: string }, member: null as null | { store_id: string }, filters: [] as unknown[][], error: null as unknown }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: (table: string) => {
  const builder = { select: () => builder, eq: (key: string, value: unknown) => { db.filters.push([table, key, value]); return builder; }, maybeSingle: async () => ({ data: table === 'stores' ? db.owner : db.member, error: db.error }) }; return builder;
} } }));
import { requireStoreAccess, resolveStoreAccess } from './access.js';
beforeEach(() => { db.owner = null; db.member = null; db.filters = []; db.error = null; });
it('keeps primary owner privileges and scopes a requested store', async () => {
  db.owner = { id: 'shop' }; expect(await resolveStoreAccess('user', 'shop')).toEqual({ storeId: 'shop', role: 'owner' });
  expect(db.filters).toContainEqual(['stores','id','shop']); expect(db.filters).toContainEqual(['stores','owner_user_id','user']);
});
it('grants only active membership for the requested store and immediately reflects revocation', async () => {
  db.member = { store_id: 'shop' }; expect(await resolveStoreAccess('manager', 'shop')).toEqual({ storeId: 'shop', role: 'manager' });
  expect(db.filters).toContainEqual(['store_memberships','is_active',true]); expect(db.filters).toContainEqual(['store_memberships','store_id','shop']);
  db.member = null; expect(await resolveStoreAccess('manager', 'shop')).toBeNull();
  await expect(requireStoreAccess('manager')).rejects.toMatchObject({ code: 'STORE_NOT_FOUND' });
});
it('fails closed on a database error rather than treating it as authorization', async () => {
  db.error = new Error('connection'); await expect(resolveStoreAccess('user')).rejects.toThrow('connection');
});
