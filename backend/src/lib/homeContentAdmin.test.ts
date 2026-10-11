import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONTENT } from '../../../packages/home-content/index.js';

const mocks = vi.hoisted(() => ({
  user: { id: '00000000-0000-4000-8000-000000000001', email: 'nishalpoojary810@gmail.com' } as {
    id: string;
    email: string;
  } | null,
  row: null as unknown,
  error: null as unknown,
  refs: true,
  update: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/lib/auth/requireAdmin', () => ({
  requireAdmin: async () =>
    mocks.user
      ? { actor: mocks.user, denied: null }
      : { actor: null, denied: new Response(JSON.stringify({ error: 'Sign in to continue.' }), { status: 401 }) },
}));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: mocks.from } }));
import { GET, PUT } from '../../../apps/admin/src/app/api/home-content/[tab]/route';

const context = { params: Promise.resolve({ tab: 'grocery' }) };
const publish = (body: unknown, origin = 'http://localhost:3000') =>
  new Request('http://localhost:3000/api/home-content/grocery', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  mocks.user = { id: '00000000-0000-4000-8000-000000000001', email: 'nishalpoojary810@gmail.com' };
  mocks.row = {
    tab_key: 'grocery',
    home_tab_id: null,
    revision: 3,
    updated_at: '2026-10-01T10:00:00Z',
    content: DEFAULT_CONTENT.grocery,
  };
  mocks.error = null;
  mocks.refs = true;
  mocks.update.mockClear();
  mocks.from.mockClear();
  mocks.from.mockImplementation(() => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      update: vi.fn((value) => {
        mocks.update(value);
        return query;
      }),
      maybeSingle: vi.fn(async () => ({ data: mocks.row, error: mocks.error })),
      in: vi.fn(async (_key, ids: string[]) => ({
        data: mocks.refs ? ids.map((id) => ({ id })) : [],
        error: null,
      })),
    };
    return query;
  });
});
describe('Admin Home content API', () => {
  it('rejects unauthenticated users before accessing data', async () => {
    mocks.user = null;
    expect(
      (await GET(new Request('http://localhost:3000/api/home-content/grocery'), context)).status,
    ).toBe(401);
    expect((await PUT(publish({}), context)).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('rejects unknown tabs and cross-origin publication', async () => {
    expect(
      (
        await GET(new Request('http://localhost:3000/api/home-content/unknown'), {
          params: Promise.resolve({ tab: 'unknown' }),
        })
      ).status,
    ).toBe(404);
    expect((await PUT(publish({}, 'https://another.example'), context)).status).toBe(403);
  });
  it('requires a validated document and optimistic revision', async () => {
    expect(
      (await PUT(publish({ revision: 0, content: DEFAULT_CONTENT.grocery }), context)).status,
    ).toBe(400);
    expect(
      (
        await PUT(
          publish({
            revision: 2,
            content: { ...DEFAULT_CONTENT.grocery, sections: [{ kind: 'script' }] },
          }),
          context,
        )
      ).status,
    ).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('rejects removed catalogue references before publication', async () => {
    const content = structuredClone(DEFAULT_CONTENT.grocery);
    content.sections[0]!.selection.productIds = ['00000000-0000-4000-8000-000000000099'];
    mocks.refs = false;
    expect((await PUT(publish({ revision: 2, content }), context)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('atomically publishes validated content with the editor identity', async () => {
    const response = await PUT(publish({ revision: 2, content: DEFAULT_CONTENT.grocery }), context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      content: DEFAULT_CONTENT.grocery,
      updated_by: mocks.user!.id,
    });
    expect((await response.json()).revision).toBe(3);
  });
  it('returns 409 rather than overwriting a newer publication', async () => {
    mocks.row = null;
    expect(
      (await PUT(publish({ revision: 2, content: DEFAULT_CONTENT.grocery }), context)).status,
    ).toBe(409);
  });
  it('does not expose internal database errors to the browser', async () => {
    mocks.error = { message: 'private database error' };
    const response = await PUT(publish({ revision: 2, content: DEFAULT_CONTENT.grocery }), context);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('private database error');
  });
});
