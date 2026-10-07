import { expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const calls = vi.hoisted(() => [] as unknown[][]);
const rows = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: () => {
  const builder = {
    select: (fields: string) => { calls.push(['select', fields]); return builder; },
    eq: (k: string, v: unknown) => { calls.push(['eq', k, v]); return builder; },
    or: (f: string) => { calls.push(['or', f]); return builder; },
    order: () => builder,
    limit: (n: number) => { calls.push(['limit', n]); return builder; },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows.value, error: null }).then(resolve),
  }; return builder;
} } }));
import { wishlistRouter } from './wishlist.js';
const handler = wishlistRouter.stack.find(l => l.route?.path === '/' && l.route.methods.get)!.route!.stack.at(-1)!.handle as RequestHandler;
async function list(query: Record<string, string>) {
  const res = { json: vi.fn() } as unknown as Response; const next = vi.fn();
  await handler({ query, user: { id: 'c1' } } as unknown as Request, res, next); return { res, next };
}
const item = (i: number) => ({ id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`, product_id: `p${i}`, created_at: `2026-01-0${i}T00:00:00Z`, products: {} });
it('pages approved wishlist items with full browse availability fields and a keyset cursor', async () => {
  rows.value = [item(3), item(2), item(1)];
  const first = await list({ limit: '2' });
  expect(calls).toContainEqual(['eq', 'products.approval_status', 'approved']);
  expect(calls).toContainEqual(['limit', 3]);
  const select = calls.find(c => c[0] === 'select')![1] as string;
  expect(select).toContain('products!inner(');
  expect(select).toMatch(/stores!inner\(.*is_active.*open_time.*close_time/);
  expect(select).toContain('product_variants(*)');
  const body = (first.res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { items: unknown[]; nextCursor: string };
  expect(body.items).toHaveLength(2);
  calls.length = 0; rows.value = [item(1)];
  const second = await list({ limit: '2', cursor: body.nextCursor });
  expect(calls).toContainEqual(['or', `created_at.lt.2026-01-02T00:00:00Z,and(created_at.eq.2026-01-02T00:00:00Z,id.lt.${item(2).id})`]);
  expect((second.res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toEqual({ items: [item(1)], nextCursor: null });
});
