import { beforeEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { originalProductPhoto, appendProductPhotos } from '../../../apps/admin/src/lib/productPhotoUpload';
import { isOriginalProductImage, PRODUCT_ORIGINALS_SCOPE } from '../../../apps/admin/src/lib/productImageOriginal';
const state = vi.hoisted(() => ({ stored: [] as { bytes: Buffer; scope?: string }[], ready: false }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => ({ denied: null }) }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {
  rpc: async () => ({ data: state.ready, error: state.ready ? null : { code: 'PGRST202' } }),
  from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }),
} }));
vi.mock('@/features/media/publicImages', () => ({ storePublicImage: async (input: { bytes: Buffer; scope?: string }) => {
  state.stored.push(input);
  return { url: `https://images.test/products/${input.scope ? `${input.scope}/` : ''}${state.stored.length}.webp`, assetId: 'asset' };
} }));
vi.mock('../../../packages/server-media/policy.cjs', async importOriginal => ({ ...await importOriginal<object>(), r2Config: () => ({}) }));
const upload = await import('../../../apps/admin/src/app/api/upload/route');
const readiness = await import('../../../apps/admin/src/app/api/product-images/original/route');
beforeEach(() => { state.stored = []; state.ready = false; });
it('returns the retained uncropped original alongside the standard image', async () => {
  const image = await sharp({ create: { width: 1440, height: 1620, channels: 3, background: '#2675ba' } }).png().toBuffer();
  const form = new FormData(); form.set('file', new File([image], 'scene.png', { type: 'image/png' })); form.set('bucket', 'product-images');
  const response = await upload.POST(new Request('https://admin.test/api/upload', { method: 'POST', body: form }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.originalUrl).toContain(`/products/${PRODUCT_ORIGINALS_SCOPE}/`);
  const original = state.stored.find(entry => entry.scope === PRODUCT_ORIGINALS_SCOPE)!;
  const metadata = await sharp(original.bytes).metadata();
  expect([metadata.width, metadata.height]).toEqual([1440, 1620]);
  expect(originalProductPhoto(result)).toMatchObject({ url: result.originalUrl, bgColor: null });
});
it('keeps original main/gallery order and refuses missing retained originals', () => {
  const photos = [1,2,3].map(i => originalProductPhoto({ url: `fit-${i}`, originalUrl: `original-${i}`, bgColor: '#fff' }));
  expect(appendProductPhotos({}, photos)).toMatchObject({ imageUrl: 'original-1', extraImageUrls: ['original-2','original-3'] });
  expect(() => originalProductPhoto({ url: 'fit', bgColor: null })).toThrow(/original photo/);
  expect(isOriginalProductImage('not-a-url')).toBe(false);
  expect(isOriginalProductImage('https://images.test/products/fitted.webp')).toBe(false);
});
it('keeps None disabled on an older database, and enables it after the queue update', async () => {
  expect(await (await readiness.GET()).json()).toEqual({ enabled: false });
  state.ready = true;
  expect(await (await readiness.GET()).json()).toEqual({ enabled: true });
});
