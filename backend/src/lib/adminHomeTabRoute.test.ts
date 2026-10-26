import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ authorized: true, written: null as Record<string, unknown> | null,
  row: { id: '00000000-0000-4000-8000-000000000071', name: 'Fruit & Veg', image_url: 'https://images.gloceries.com/appsui/old.webp', sort_order: 1, is_active: true } }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => fixture.authorized
  ? { actor: { id: 'admin', email: 'ops@example.com' }, denied: null }
  : { actor: null, denied: new Response(JSON.stringify({ error: 'Sign in to continue.' }), { status: 401 }) } }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn(() => {
  const chain = { select: () => chain, eq: () => chain,
    update: (data: Record<string, unknown>) => { fixture.written = data; return chain; },
    single: async () => ({ data: { ...fixture.row, ...fixture.written }, error: null }) };
  return chain;
}) } }));
import { PATCH } from '../../../apps/admin/src/app/api/home-tabs/[id]/route';
import { supabaseAdmin } from '../../../apps/admin/src/lib/supabase/admin';
const context = { params: Promise.resolve({ id: fixture.row.id }) } as never;
const request = (body: unknown) => new Request(`https://admin.test/api/home-tabs/${fixture.row.id}`,
  { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => { fixture.authorized = true; fixture.written = null; vi.clearAllMocks(); });

it('saves the tab card image shown on the Home category grid', async () => {
  const response = await PATCH(request({ name: 'Fruit & Veg', sortOrder: 1, isActive: true, imageUrl: 'https://images.gloceries.com/appsui/fruit.webp' }), context);
  expect(response.status).toBe(200);
  expect(fixture.written).toMatchObject({ image_url: 'https://images.gloceries.com/appsui/fruit.webp', sort_order: 1 });
  expect(await response.json()).toMatchObject({ imageUrl: 'https://images.gloceries.com/appsui/fruit.webp' });
});

it('removes the card image when asked', async () => {
  await PATCH(request({ name: 'Fruit & Veg', sortOrder: 1, isActive: true, imageUrl: null }), context);
  expect(fixture.written).toMatchObject({ image_url: null });
});

it('keeps the card image when the tab is only renamed', async () => {
  const response = await PATCH(request({ name: 'Fresh', sortOrder: 1, isActive: true }), context);
  expect(response.status).toBe(200);
  expect(fixture.written).toEqual({ name: 'Fresh', sort_order: 1, is_active: true });
  expect(await response.json()).toMatchObject({ name: 'Fresh', imageUrl: 'https://images.gloceries.com/appsui/old.webp' });
});

it('refuses unauthenticated changes before touching the database', async () => {
  fixture.authorized = false;
  expect((await PATCH(request({ name: 'X', imageUrl: null }), context)).status).toBe(401);
  expect(supabaseAdmin.from).not.toHaveBeenCalled();
});
