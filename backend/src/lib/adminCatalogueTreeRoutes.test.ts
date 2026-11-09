import { beforeEach, expect, it, vi } from 'vitest';

// Admin product saves and approvals require a sub-category (migration
// 20261104140000): the product's category is its sub-category's parent.
// They also need a photo: products without one are never shown in the apps.
const db = vi.hoisted(() => ({
  parent: 'Chicken' as string | null,
  product: { sub_category_id: null as string | null, image_url: 'https://cdn.test/p.webp' as string | null },
  approved: null as unknown,
  rpc: vi.fn(async () => ({ data: 'p1', error: null })),
}));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => ({ actor: { id: 'admin' }, denied: null }) }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { rpc: db.rpc, from: (table: string) => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: () => chain, eq: () => chain,
    update: (row: unknown) => { if (table === 'products') db.approved = row; return chain; },
    maybeSingle: async () => table === 'sub_categories'
      ? { data: db.parent ? { categories: { name: db.parent } } : null, error: null }
      : { data: db.product, error: null },
    single: async () => ({ data: { id: 'p1' }, error: null }),
  });
  return chain;
} } }));
import { POST } from '../../../apps/admin/src/app/api/products/route';
import { PATCH as approve } from '../../../apps/admin/src/app/api/products/[id]/approval/route';

const body = { storeId: 's1', name: 'Chicken curry cut', category: 'Anything', stockStatus: 'in_stock', imageUrl: 'https://cdn.test/p.webp',
  variants: [{ unitType: 'kg', quantity: 1, price: 240, stockQuantity: 5 }] };
const post = (input: unknown) => POST(new Request('https://admin.test/api/products', { method: 'POST', body: JSON.stringify(input) }));
const ctx = { params: Promise.resolve({ id: 'p1' }) } as never;
const approval = (value: boolean) => approve(new Request('https://admin.test/api/products/p1/approval', { method: 'PATCH', body: JSON.stringify({ approve: value }) }), ctx);

beforeEach(() => { db.parent = 'Chicken'; db.product = { sub_category_id: null, image_url: 'https://cdn.test/p.webp' }; db.approved = null; db.rpc.mockClear(); });

it('refuses a product with no sub-category, or one that no longer exists', async () => {
  expect((await post(body)).status).toBe(400);
  db.parent = null;
  expect((await post({ ...body, subCategoryId: 'sub-gone' })).status).toBe(400);
  expect(db.rpc).not.toHaveBeenCalled();
});

it('takes the category from the sub-category, so chicken options follow it', async () => {
  await post({ ...body, subCategoryId: 'sub-curry', cutOptionsEnabled: true, bulkMinKg: 5 });
  expect(db.rpc).toHaveBeenCalledWith('save_catalogue_product', expect.objectContaining({
    p_fields: expect.objectContaining({ category: 'Chicken', sub_category_id: 'sub-curry' }) }));
});

it('only approves products filed under a sub-category; rejecting needs none', async () => {
  expect((await approval(true)).status).toBe(409);
  expect(db.approved).toBeNull();
  expect((await approval(false)).status).toBe(200);
  db.product = { sub_category_id: 'sub-curry', image_url: 'https://cdn.test/p.webp' };
  expect((await approval(true)).status).toBe(200);
  expect(db.approved).toEqual({ approval_status: 'approved' });
});

it('adding or approving a product needs a photo', async () => {
  expect((await post({ ...body, imageUrl: '', subCategoryId: 'sub-curry' })).status).toBe(400);
  expect(db.rpc).not.toHaveBeenCalled();
  db.product = { sub_category_id: 'sub-curry', image_url: null };
  expect((await approval(true)).status).toBe(409);
  expect(db.approved).toBeNull();
});
