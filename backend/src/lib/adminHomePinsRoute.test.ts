import { beforeEach, expect, it, vi } from 'vitest';

// Admin → Home Sections picks (app/api/home-sections/*) and Inventory "Show on home".
const db = vi.hoisted(() => ({
  authorized: true,
  rpc: null as null | { name: string; args: unknown },
  rpcResult: { data: null as unknown, error: null as unknown },
  upserted: null as unknown,
  inserted: null as unknown,
  deleted: null as unknown,
  sections: [{ key: 'trending', title: null, enabled: true, sort_index: 0, is_custom: false }] as Record<string, unknown>[],
  pins: [{ section_key: 'trending', product_id: 'b0000000-0000-4000-8000-000000000002', position: 0 }] as Record<string, unknown>[],
}));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => db.authorized
  ? { actor: { id: 'admin', email: 'ops@example.com' }, denied: null }
  : { actor: null, denied: new Response(JSON.stringify({ error: 'Sign in to continue.' }), { status: 401 }) } }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {
  rpc: async (name: string, args: unknown) => { db.rpc = { name, args }; return db.rpcResult; },
  from: (table: string) => {
    const rows = table === 'home_sections' ? db.sections : db.pins;
    const chain: Record<string, unknown> = {
      select: () => chain, order: () => chain, limit: () => chain, eq: () => chain,
      maybeSingle: async () => ({ data: { sort_index: 120 }, error: null }),
      upsert: async (value: unknown) => { db.upserted = value; return { error: null }; },
      insert: async (value: unknown) => { db.inserted = value; return { error: null }; },
      delete: () => { db.deleted = table; return chain; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return chain;
  },
} }));
import * as sections from '../../../apps/admin/src/app/api/home-sections/route';
import * as picks from '../../../apps/admin/src/app/api/home-sections/products/route';
import * as byProduct from '../../../apps/admin/src/app/api/home-sections/by-product/route';
import { acceptsPins, isoToScheduleInput, newCustomSectionKey, parseProductIds, scheduleToIso } from '../../../apps/admin/src/lib/homeSectionPins';

const A = 'a0000000-0000-4000-8000-000000000001';
const B = 'b0000000-0000-4000-8000-000000000002';
const json = (body: unknown, method = 'PUT') => new Request('http://admin/api', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

beforeEach(() => { db.authorized = true; db.rpc = null; db.rpcResult = { data: null, error: null }; db.upserted = null; db.inserted = null; db.deleted = null; });

it('helpers: only product rails and custom sections take picks; ids and schedules are validated', () => {
  expect(acceptsPins('trending')).toBe(true);
  expect(acceptsPins('everyday-dairy')).toBe(true);
  expect(acceptsPins('nearby-stores')).toBe(false);
  expect(acceptsPins(newCustomSectionKey(() => 0.5))).toBe(true);
  expect(() => parseProductIds([A, A])).toThrow(/only once/);
  expect(() => parseProductIds(['nope'])).toThrow();
  expect(() => parseProductIds(Array.from({ length: 31 }, (_, i) => `a0000000-0000-4000-8000-${String(i).padStart(12, '0')}`))).toThrow(/30/);
  expect(scheduleToIso('2026-11-01T09:30')).toBe('2026-11-01T04:00:00.000Z');
  expect(isoToScheduleInput('2026-11-01T04:00:00.000Z')).toBe('2026-11-01T09:30');
  expect(scheduleToIso('')).toBeNull();
});

it('GET lists sections with their picked product ids in order', async () => {
  const body = await (await sections.GET()).json();
  expect(body[0]).toMatchObject({ key: 'trending', product_ids: [B] });
});

it('PUT saves layout, schedule and the custom flag; a custom section needs a title', async () => {
  const res = await sections.PUT(json({ sections: [
    { key: 'trending', enabled: true, pinned_only: true, starts_at: '2026-11-01T09:30', ends_at: '' },
    { key: 'custom-abc12345', title: 'Diwali', enabled: false },
  ] }));
  expect(res.status).toBe(200);
  expect(db.upserted).toEqual([
    expect.objectContaining({ key: 'trending', sort_index: 0, is_custom: false, pinned_only: true, starts_at: '2026-11-01T04:00:00.000Z', ends_at: null }),
    expect.objectContaining({ key: 'custom-abc12345', sort_index: 10, is_custom: true, title: 'Diwali' }),
  ]);
  const bad = await sections.PUT(json({ sections: [{ key: 'custom-abc12345', title: ' ', enabled: true }] }));
  expect(bad.status).toBe(400);
  const backwards = await sections.PUT(json({ sections: [{ key: 'trending', enabled: true, starts_at: '2026-11-02T09:00', ends_at: '2026-11-01T09:00' }] }));
  expect(backwards.status).toBe(400);
});

it('POST adds a hidden custom section at the end; DELETE only removes custom ones', async () => {
  expect((await sections.POST(json({ title: 'Monsoon must-haves' }, 'POST'))).status).toBe(201);
  expect(db.inserted).toMatchObject({ title: 'Monsoon must-haves', enabled: false, is_custom: true, sort_index: 130 });
  expect((db.inserted as { key: string }).key).toMatch(/^custom-[a-z0-9]{8}$/);
  expect((await sections.POST(json({ title: '' }, 'POST'))).status).toBe(400);
  expect((await sections.DELETE(new Request('http://admin/api?key=trending', { method: 'DELETE' }))).status).toBe(400);
  expect(db.deleted).toBeNull();
  expect((await sections.DELETE(new Request('http://admin/api?key=custom-abc12345', { method: 'DELETE' }))).status).toBe(200);
});

it('section picks save through one RPC in the given order', async () => {
  expect((await picks.PUT(json({ key: 'trending', productIds: [B, A] }))).status).toBe(200);
  expect(db.rpc).toEqual({ name: 'admin_set_home_section_products', args: { p_key: 'trending', p_product_ids: [B, A] } });
  db.rpc = null;
  expect((await picks.PUT(json({ key: 'nearby-stores', productIds: [A] }))).status).toBe(400);
  expect(db.rpc).toBeNull();
  db.rpcResult = { data: null, error: { code: 'P0404', message: 'A pinned product no longer exists.' } };
  const gone = await picks.PUT(json({ key: 'trending', productIds: [A] }));
  expect(gone.status).toBe(404);
  expect((await gone.json()).error).toBe('A pinned product no longer exists.');
});

it('Inventory "Show on home" ticks sections for one product', async () => {
  db.rpcResult = { data: ['custom-abc12345', 'trending'], error: null };
  const res = await byProduct.PUT(json({ productId: A, keys: ['trending', 'custom-abc12345'] }));
  expect(await res.json()).toEqual({ keys: ['custom-abc12345', 'trending'] });
  expect(db.rpc).toEqual({ name: 'admin_set_product_home_sections', args: { p_product: A, p_keys: ['trending', 'custom-abc12345'] } });
  expect((await byProduct.PUT(json({ productId: A, keys: ['top-rated-stores'] }))).status).toBe(400);
  expect((await byProduct.GET(new Request('http://admin/api?productId=bad'))).status).toBe(400);
  db.authorized = false;
  expect((await byProduct.GET(new Request(`http://admin/api?productId=${A}`))).status).toBe(401);
});
