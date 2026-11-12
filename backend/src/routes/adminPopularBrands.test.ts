import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => ({ denied: null }) }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: () => mock } }));
import { PATCH } from '../../../apps/admin/src/app/api/brands/popular/route';
const base = { id: '00000000-0000-4000-8000-000000000001', position: 1, imageUrl: 'https://example.com/logo.png' };
beforeEach(() => {
  vi.clearAllMocks();
  mock.update.mockReturnValue(mock); mock.eq.mockReturnValue(mock); mock.select.mockReturnValue(mock);
  mock.maybeSingle.mockResolvedValue({ data: base, error: null });
});
const request = (body: object) => PATCH(new Request('https://example.com/api/brands/popular', { method: 'PATCH', body: JSON.stringify(body) }));
it('saves logo and banner independently', async () => {
  expect((await request({ ...base, bannerUrl: 'https://example.com/banner.png' })).status).toBe(200);
  expect(mock.update).toHaveBeenCalledWith({ popular_position: 1, popular_image_url: base.imageUrl, popular_banner_url: 'https://example.com/banner.png' });
});
it('preserves banners when older clients omit the field and allows explicit clearing', async () => {
  await request(base);
  expect(mock.update.mock.calls[0][0]).not.toHaveProperty('popular_banner_url');
  await request({ ...base, bannerUrl: null });
  expect(mock.update.mock.calls[1][0].popular_banner_url).toBeNull();
});
it('rejects unsafe banner URLs before writing', async () => {
  for (const bannerUrl of ['http://example.com/a.png', 'https://user:password@example.com/a.png', 'https://example.com/a b.png']) {
    expect((await request({ ...base, bannerUrl })).status).toBe(400);
  }
  expect(mock.update).not.toHaveBeenCalled();
});
