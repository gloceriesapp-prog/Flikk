import { beforeEach, expect, it, vi } from 'vitest';
import { createCustomContent, createSection, customContentKey } from '../../../packages/home-content/index.js';
const mocks = vi.hoisted(() => ({ exists: true, linked: null as { tab_key: string } | null, saved: null as unknown, insertError: null as { code: string } | null, insert: vi.fn(), refs: true, denied: false, from: vi.fn() }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => mocks.denied ? { denied: new Response(null, { status: 401 }) } : { actor: { id: 'actor' }, denied: null } }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: mocks.from } }));
import { GET, PUT } from '../../../apps/admin/src/app/api/home-content/[tab]/route';
const id = '00000000-0000-4000-8000-000000000001';
const key = customContentKey(id);
const context = { params: Promise.resolve({ tab: key }) };
const content = createCustomContent('Local snacks');
const request = (doc = content, origin = 'http://localhost:3000') => new Request(`http://localhost:3000/api/home-content/${key}`, { method: 'PUT', headers: { Origin: origin }, body: JSON.stringify({ revision: 0, content: doc }) });
beforeEach(() => {
  mocks.exists = true; mocks.linked = null; mocks.saved = null; mocks.insertError = null; mocks.refs = true; mocks.denied = false; mocks.insert.mockReset(); mocks.from.mockReset();
  mocks.from.mockImplementation((table: string) => {
    let selected = ''; let inserted = false;
    const q = {
      select: vi.fn((value: string) => { selected = value; return q; }), eq: vi.fn(() => q),
      insert: vi.fn((value: unknown) => { inserted = true; mocks.insert(value); return q; }),
      maybeSingle: vi.fn(async () => table === 'home_tabs' ? { data: mocks.exists ? { id, name: 'Local snacks', is_active: true } : null, error: null } :
        inserted ? { data: { tab_key: key, home_tab_id: id, revision: 1, content }, error: mocks.insertError } :
        { data: selected === 'tab_key' ? mocks.linked : mocks.saved, error: null }),
      in: vi.fn(async (_key: string, ids: string[]) => ({ data: mocks.refs ? ids.map(id => ({ id })) : [], error: null })),
    }; return q;
  });
});
it('returns an unsaved, isolated layout without writing on GET', async () => {
  const response = await GET(new Request('http://localhost:3000'), context);
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ tabKey: key, homeTabId: id, revision: 0, content: { tabTitle: 'Local snacks', sections: [] } });
  expect(mocks.insert).not.toHaveBeenCalled();
});
it('publishes a new layout with an atomic insert bound to its real category', async () => {
  expect((await PUT(request(), context)).status).toBe(200);
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ tab_key: key, home_tab_id: id, content }));
});
it('prevents concurrent first publications from overwriting each other', async () => {
  mocks.insertError = { code: '23505' };
  expect((await PUT(request(), context)).status).toBe(409);
});
it('rejects deleted categories, unauthorized access and conflicting layouts', async () => {
  mocks.exists = false; expect((await GET(new Request('http://localhost:3000'), context)).status).toBe(404);
  mocks.exists = true; mocks.linked = { tab_key: 'grocery' }; expect((await PUT(request(), context)).status).toBe(409);
  mocks.denied = true; expect((await PUT(request(), context)).status).toBe(401);
});
it('validates origin and new catalogue selections before inserting', async () => {
  expect((await PUT(request(content, 'https://other.example'), context)).status).toBe(403);
  const section = createSection('products', 'snacks'); section.selection.productIds = [id];
  mocks.refs = false;
  expect((await PUT(request({ ...content, sections: [section] }), context)).status).toBe(400);
  expect(mocks.insert).not.toHaveBeenCalled();
});
