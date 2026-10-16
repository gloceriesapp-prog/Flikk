import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
import { readFileSync } from 'node:fs';
const db = vi.hoisted(() => ({
  role: 'owner', filters: [] as unknown[][], rows: [] as {user_id: string}[],
  error: null as {code: string; message: string} | null,
  rpcs: [] as unknown[],
}));
vi.mock('../stores/access.js', () => ({ requireStoreAccess: vi.fn(async () => ({ storeId: 'my-store', role: db.role })) }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    db.filters.push(['from', table]);
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'lt', 'order']) chain[method] = (...args: unknown[]) => { db.filters.push([method, ...args]); return chain; };
    chain.limit = async (limit: number) => { db.filters.push(['limit', limit]); return {data: db.rows, error: db.error}; };
    return chain;
  },
  rpc: async (...args: unknown[]) => { db.rpcs.push(args); return {data: {id: 'pending-request'}, error: db.error}; },
} }));
import { documentReplacement, partnerManagementRouter, requireStoreOwner } from './partnerManagement.js';
async function request(method: string, path: string, body = {}, query = {}, id = '11111111-1111-1111-1111-111111111111') {
  const handler = partnerManagementRouter.stack.find(layer => layer.route?.path === path && (layer.route as unknown as { methods: Record<string, boolean> }).methods[method])!.route!.stack.at(-1)!.handle as RequestHandler;
  const res = {json: vi.fn(), status: vi.fn().mockReturnThis()} as unknown as Response;
  const next = vi.fn();
  await handler({user: {id: 'owner'}, params: {id}, body, query} as unknown as Request, res, next);
  return {res, error: next.mock.calls[0]?.[0]};
}
beforeEach(() => { db.role = 'owner'; db.filters = []; db.rows = []; db.rpcs = []; db.error = null; });
it('blocks managers before staff or legal-document handlers run', async () => {
  db.role = 'manager';
  const next = vi.fn();
  await requireStoreOwner({user: {id: 'manager'}} as unknown as Request, {} as Response, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({status: 403, code: 'OWNER_REQUIRED'}));
  expect(db.filters).toEqual([]);
  expect(db.rpcs).toEqual([]);
});
it('normalizes valid legal numbers and rejects unrelated fields, malformed numbers and batches', () => {
  expect(documentReplacement({pan_number: ' abcde1234f '})).toEqual({pan_number: 'ABCDE1234F'});
  for (const body of [null, [], {}, {owner_user_id: 'other'}, {pan_number: 'bad'}, {gst_number: 'bad'}, {fssai_number: '123'}, {pan_number: 'ABCDE1234F', gst_number: '22ABCDE1234F1Z5'}, {shop_establishment_number: 'a'.repeat(101)}]) {
    expect(() => documentReplacement(body)).toThrow();
  }
});
it('reads bounded active staff pages scoped to the current store, without private account columns', async () => {
  db.rows = [{user_id: '22222222-2222-2222-2222-222222222222'}, {user_id: '11111111-1111-1111-1111-111111111111'}];
  const first = await request('get', '/team', {}, {limit: '1'});
  expect(db.filters).toContainEqual(['eq', 'store_id', 'my-store']);
  expect(db.filters).toContainEqual(['eq', 'is_active', true]);
  expect(db.filters).toContainEqual(['limit', 2]);
  expect(db.filters).toContainEqual(['select', 'user_id,role,users!user_id(name)']);
  const page = (first.res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
  expect(page.items).toHaveLength(1);
  await request('get', '/team', {}, {limit: '1', cursor: page.nextCursor});
  expect(db.filters).toContainEqual(['lt', 'user_id', db.rows[0].user_id]);
});
it('rejects oversized staff pages and invalid removal IDs before database writes', async () => {
  expect((await request('get', '/team', {}, {limit: '101'})).error).toMatchObject({status: 400});
  expect((await request('delete', '/team/:id', {}, {}, 'not-a-uuid')).error).toMatchObject({status: 400});
  expect(db.rpcs).toEqual([]);
});
it('removes access through the atomic owner-checked RPC instead of updating roles', async () => {
  await request('delete', '/team/:id');
  expect(db.rpcs).toEqual([['partner_remove_store_member', {p_store: 'my-store', p_owner: 'owner', p_member: '11111111-1111-1111-1111-111111111111'}]]);
});
it('submits document replacements for admin review and surfaces transaction failures', async () => {
  const result = await request('post', '/document-replacements', {pan_number: 'ABCDE1234F'});
  expect(result.res.status).toHaveBeenCalledWith(202);
  expect(db.rpcs).toContainEqual(['partner_request_store_profile_change', {p_store: 'my-store', p_user: 'owner', p_changes: {pan_number: 'ABCDE1234F'}}]);
  db.error = {code: 'P0409', message: 'Retry the review request'};
  expect((await request('post', '/document-replacements', {pan_number: 'ABCDE1234F'})).error).toMatchObject({status: 409});
});
it('keeps replacement and membership RPCs service-only and prevents removal of the primary owner', () => {
  const sql = readFileSync(new URL('../../migrations/20261015044025_partner_management_workflows.sql', import.meta.url), 'utf8');
  for (const signature of ['partner_request_store_profile_change(uuid, uuid, jsonb)', 'admin_review_store_profile_change(uuid, boolean, text, uuid)', 'partner_remove_store_member(uuid,uuid,uuid)']) {
    expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC,`);
    expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${signature} TO service_role`);
  }
  expect(sql).toContain('IF p_member=p_owner');
  expect(sql).toContain("status='pending' FOR UPDATE");
  expect(sql).toContain("status='superseded'");
});
