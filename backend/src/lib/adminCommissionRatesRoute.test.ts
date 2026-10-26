import { beforeEach, expect, it, vi } from 'vitest';

// Admin → Settings → Commission by category (app/api/commission-rates).
const db = vi.hoisted(() => ({
  authorized: true,
  rates: [{ category: 'Dairy, Bread & Eggs', commission_rate: '0' }, { category: 'Old category', commission_rate: '0.05' }] as { category: string; commission_rate: unknown }[],
  settings: { id: 'settings-1', commission_rate: '0.04', commission_cap_per_order: '30' } as Record<string, unknown>,
  upserted: null as unknown,
  deleted: null as unknown,
  updated: null as unknown,
}));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => db.authorized
  ? { actor: { id: 'admin', email: 'ops@example.com' }, denied: null }
  : { actor: null, denied: new Response(JSON.stringify({ error: 'Sign in to continue.' }), { status: 401 }) } }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (table: string) => {
  if (table === 'category_commission_rates') {
    return {
      select: () => Promise.resolve({ data: db.rates, error: null }),
      upsert: async (rows: unknown) => { db.upserted = rows; return { error: null }; },
      delete: () => ({ in: async (_column: string, names: unknown) => { db.deleted = names; return { error: null }; } }),
    };
  }
  const chain = { select: () => chain, limit: () => chain, eq: async () => ({ error: null }),
    single: async () => ({ data: db.settings, error: null }),
    update: (row: unknown) => { db.updated = row; return chain; } };
  return chain;
} } }));
import { GET, PUT } from '../../../apps/admin/src/app/api/commission-rates/route';
import { parseCommissionSettings } from '../../../apps/admin/src/lib/commissionRates';

const put = (body: unknown) => PUT(new Request('https://admin.test/api/commission-rates',
  { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));

beforeEach(() => { db.authorized = true; db.upserted = null; db.deleted = null; db.updated = null; });

it('lists every product category, with its rate or none, then other saved categories', async () => {
  const body = await (await GET()).json();
  expect(body.defaultRate).toBe(0.04);
  expect(body.capPerOrder).toBe(30);
  expect(body.categories[0]).toEqual({ category: 'Vegetables & Fruits', commissionRate: null });
  expect(body.categories).toContainEqual({ category: 'Dairy, Bread & Eggs', commissionRate: 0 });
  expect(body.categories.at(-1)).toEqual({ category: 'Old category', commissionRate: 0.05 });
});

it('saves category rates, clears blank ones and stores the default and cap', async () => {
  const response = await put({ defaultRate: 0.04, capPerOrder: 30, categories: [
    { category: 'Dairy, Bread & Eggs', commissionRate: 0 },
    { category: 'Personal Care', commissionRate: 0.08 },
    { category: 'Old category', commissionRate: null },
  ] });
  expect(response.status).toBe(200);
  expect(db.upserted).toEqual([
    expect.objectContaining({ category: 'Dairy, Bread & Eggs', commission_rate: 0 }),
    expect.objectContaining({ category: 'Personal Care', commission_rate: 0.08 }),
  ]);
  expect(db.deleted).toEqual(['Old category']);
  expect(db.updated).toMatchObject({ commission_rate: 0.04, commission_cap_per_order: 30 });
});

it('refuses rates outside 0-100%, a negative cap and duplicate categories', async () => {
  expect((await put({ defaultRate: 1.5, capPerOrder: null, categories: [] })).status).toBe(400);
  expect((await put({ defaultRate: 0.04, capPerOrder: -1, categories: [] })).status).toBe(400);
  expect(() => parseCommissionSettings({ defaultRate: 0.04, categories: [{ category: 'Beverages', commissionRate: 0.04 }, { category: ' beverages', commissionRate: 0.02 }] })).toThrow('twice');
  expect(db.upserted).toBeNull(); expect(db.updated).toBeNull();
});

it('requires an admin', async () => {
  db.authorized = false;
  expect((await GET()).status).toBe(401);
  expect((await put({ defaultRate: 0, categories: [] })).status).toBe(401);
});
