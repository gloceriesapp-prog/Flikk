import { beforeEach, expect, it, vi } from 'vitest';

const fx = vi.hoisted(() => ({
  authorized: true,
  zones: [] as { id: string; name: string; is_active: boolean }[],
  inserted: null as Record<string, unknown> | null,
  storeUpdate: null as Record<string, unknown> | null,
  insertError: null as { code: string } | null,
}));
vi.mock('@/lib/supabase/server', () => ({
  requireAdminSession: async () => (fx.authorized ? { id: 'admin', email: 'nishalpoojary810@gmail.com' } : null),
}));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (table: string) => {
  let id = '';
  const chain = {
    select: () => chain,
    eq: (_c: string, v: string) => { id = v; return chain; },
    insert: (row: Record<string, unknown>) => { fx.inserted = row; return chain; },
    update: (row: Record<string, unknown>) => { if (table === 'stores') fx.storeUpdate = row; return chain; },
    single: async () => (fx.insertError ? { data: null, error: fx.insertError } : { data: { id: 'zone-new', ...fx.inserted }, error: null }),
    maybeSingle: async () => (table === 'zones'
      ? { data: fx.zones.find((z) => z.id === id) ?? null, error: null }
      : { data: { id }, error: null }),
  };
  return chain;
} } }));
import { POST as createZone } from '../../../apps/admin/src/app/api/zones/route';
import { POST as moveStore } from '../../../apps/admin/src/app/api/stores/[id]/zone/route';
import { parseZoneName, zoneSlug } from '../../../apps/admin/src/lib/zoneValidation';

const STORE = '00000000-0000-4000-8000-000000000001';
const ACTIVE = '00000000-0000-4000-8000-0000000000a1';
const INACTIVE = '00000000-0000-4000-8000-0000000000a2';
const json = (body: unknown) => new Request('https://admin.test/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(() => {
  fx.authorized = true; fx.inserted = null; fx.storeUpdate = null; fx.insertError = null;
  fx.zones = [{ id: ACTIVE, name: 'Kaup, Udupi', is_active: true }, { id: INACTIVE, name: 'Karkala', is_active: false }];
});

it('normalizes zone names and slugs', () => {
  expect(parseZoneName('  Karkala,   Udupi ')).toBe('Karkala, Udupi');
  expect(zoneSlug('Karkala, Udupi')).toBe('karkala-udupi');
  expect(() => parseZoneName('K')).toThrow();
  expect(() => zoneSlug('—')).toThrow();
});

it('creates a zone with a slug, inactive by default', async () => {
  const res = await createZone(json({ name: 'Karkala, Udupi' }));
  expect(res.status).toBe(201);
  expect(fx.inserted).toEqual({ name: 'Karkala, Udupi', slug: 'karkala-udupi', is_active: false });
});

it('reports a duplicate zone and refuses non-admins', async () => {
  fx.insertError = { code: '23505' };
  expect((await createZone(json({ name: 'Kaup' }))).status).toBe(409);
  fx.authorized = false;
  expect((await createZone(json({ name: 'Kaup' }))).status).toBe(401);
});

it('moves a store only into an active zone', async () => {
  const ctx = { params: Promise.resolve({ id: STORE }) } as never;
  expect((await moveStore(json({ zoneId: INACTIVE }), ctx)).status).toBe(400);
  expect(fx.storeUpdate).toBeNull();
  const res = await moveStore(json({ zoneId: ACTIVE }), ctx);
  expect(res.status).toBe(200);
  expect(fx.storeUpdate).toEqual({ zone_id: ACTIVE });
});
