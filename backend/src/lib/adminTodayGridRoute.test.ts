import { beforeEach, describe, expect, it, vi } from 'vitest';

// Admin → Today grid config API (apps/admin/src/app/api/today-grid/*):
// versioned drafts, publish, restore, master switch. In-memory tables.
const db = vi.hoisted(() => ({
  authorized: true,
  versions: [] as Record<string, unknown>[],
  state: { enabled: true, published_version_id: null as number | null },
  rpc: null as null | { name: string; args: Record<string, unknown> },
}));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => db.authorized
  ? { actor: { id: 'admin', email: 'ops@example.com' }, denied: null }
  : { actor: null, denied: new Response(JSON.stringify({ error: 'Sign in to continue.' }), { status: 401 }) } }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {
  rpc: async (name: string, args: Record<string, unknown>) => {
    db.rpc = { name, args };
    db.state.published_version_id = args.p_version as number;
    return { data: null, error: null };
  },
  from: (table: string) => {
    let rows = table === 'today_grid_versions' ? [...db.versions] : [db.state];
    let inserted: Record<string, unknown> | null = null;
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, value: unknown) => { rows = rows.filter(r => col === 'id' && table === 'today_grid_state' ? true : r[col] === value); return chain; },
      order: () => { rows.sort((a, b) => (b.id as number) - (a.id as number)); return chain; },
      limit: (n: number) => { rows = rows.slice(0, n); return chain; },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      single: async () => ({ data: inserted ?? rows[0], error: null }),
      insert: (value: Record<string, unknown>) => {
        inserted = { id: db.versions.length + 1, created_at: '2026-12-15T00:00:00Z', published_at: null, restored_from: null, note: null, ...value };
        db.versions.push(inserted); return chain;
      },
      upsert: async (value: Record<string, unknown>) => { Object.assign(db.state, value); return { error: null }; },
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return chain;
  },
} }));

import { GET, PUT } from '../../../apps/admin/src/app/api/today-grid/route';
import { POST as PUBLISH } from '../../../apps/admin/src/app/api/today-grid/publish/route';
import { POST as RESTORE } from '../../../apps/admin/src/app/api/today-grid/restore/route';
import { PATCH as STATE } from '../../../apps/admin/src/app/api/today-grid/state/route';
import { DEFAULT_CONFIG } from '../../../packages/today-grid/index.js';

const req = (body: unknown) => new Request('http://admin/api/today-grid', { method: 'POST', body: JSON.stringify(body) });
const json = async (res: Response) => ({ status: res.status, body: await res.json() as Record<string, unknown> });
const edit = (patch: (c: typeof DEFAULT_CONFIG) => void) => { const c = structuredClone(DEFAULT_CONFIG); patch(c); return c; };

beforeEach(() => { db.authorized = true; db.versions = []; db.state = { enabled: true, published_version_id: null }; db.rpc = null; });

describe('save draft', () => {
  it('saves a valid config as a new version with who and what changed', async () => {
    const { status, body } = await json(await PUT(req({ config: edit(c => { c.items['tea-coffee'].title = 'Chai Time'; }) })));
    expect(status).toBe(200);
    expect(body).toMatchObject({ versionId: 1 });
    const saved = db.versions[0]!;
    expect(saved.created_by).toBe('ops@example.com');
    expect(saved.diff).toEqual([{ path: 'items.tea-coffee.title', from: 'Tea & Coffee', to: 'Chai Time' }]);
    expect((saved.config as typeof DEFAULT_CONFIG).items['tea-coffee']).toMatchObject({ updatedBy: 'ops@example.com', updatedAt: expect.any(String) });
    expect((saved.config as typeof DEFAULT_CONFIG).items['snack-time'].updatedBy).toBeNull();
  });
  it('rejects unknown placeholders and failing contrast with exact paths', async () => {
    const bad = await json(await PUT(req({ config: edit(c => { c.items['tea-coffee'].tag = 'Landed {time}'; c.items['snack-time'].accent = '#F2A900'; }) })));
    expect(bad.status).toBe(422);
    expect((bad.body.errors as { path: string }[]).map(e => e.path)).toEqual(['items.tea-coffee.tag', 'items.snack-time.accent']);
    expect(db.versions).toHaveLength(0);
  });
  it('a save without changes adds no version', async () => {
    await PUT(req({ config: DEFAULT_CONFIG }));
    expect((await json(await PUT(req({ config: DEFAULT_CONFIG })))).body).toMatchObject({ unchanged: true, versionId: 1 });
    expect(db.versions).toHaveLength(1);
  });
});

describe('draft vs published', () => {
  it('a draft is not live until published; publish re-validates and points the grid at it', async () => {
    await PUT(req({ config: DEFAULT_CONFIG }));
    await PUT(req({ config: edit(c => { c.items['tea-coffee'].line = 'Draft line'; }) }));
    await PUBLISH(req({ versionId: 1 }));
    const view = (await json(await GET())).body as { draft: { id: number }; published: { id: number; config: typeof DEFAULT_CONFIG }; versions: { id: number; live: boolean }[] };
    expect(view.draft.id).toBe(2);
    expect(view.published.id).toBe(1);
    expect(view.published.config.items['tea-coffee'].line).toBe(DEFAULT_CONFIG.items['tea-coffee'].line);
    expect(view.versions.find(v => v.live)?.id).toBe(1);
    expect(db.rpc).toEqual({ name: 'publish_today_grid', args: { p_version: 1, p_admin_email: 'ops@example.com' } });
  });
  it('refuses to publish a stored version that no longer validates', async () => {
    db.versions.push({ id: 1, config: edit(c => { c.items['tea-coffee'].tag = 'From {nope}'; }), created_at: 'x', created_by: 'ops@example.com', diff: [] });
    expect((await PUBLISH(req({ versionId: 1 }))).status).toBe(422);
    expect(db.rpc).toBeNull();
  });
});

describe('restore', () => {
  it('copies an old version into a new draft and never rewrites history', async () => {
    await PUT(req({ config: DEFAULT_CONFIG }));
    await PUT(req({ config: edit(c => { c.items['tea-coffee'].title = 'Chai'; }) }));
    const { body } = await json(await RESTORE(req({ versionId: 1 })));
    expect(body).toEqual({ versionId: 3, restoredFrom: 1 });
    expect(db.versions[2]).toMatchObject({ restored_from: 1, note: 'Restored from version 1' });
    expect((db.versions[2]!.config as typeof DEFAULT_CONFIG).items['tea-coffee'].title).toBe('Tea & Coffee');
    expect(db.versions).toHaveLength(3);
  });
});

describe('roles and switch', () => {
  it('only the admin can read, save, publish, restore or switch', async () => {
    db.authorized = false;
    for (const res of [await GET(), await PUT(req({ config: DEFAULT_CONFIG })), await PUBLISH(req({ versionId: 1 })), await RESTORE(req({ versionId: 1 })), await STATE(req({ enabled: false }))])
      expect(res.status).toBe(401);
    expect(db.versions).toHaveLength(0);
  });
  it('switches the grid off and on', async () => {
    expect((await json(await STATE(req({ enabled: false })))).body).toEqual({ enabled: false });
    expect(db.state.enabled).toBe(false);
    expect((await STATE(req({ enabled: 'no' }))).status).toBe(400);
  });
});
