import { afterEach, expect, it, vi } from 'vitest';
import { cropProductPhoto, DEFAULT_PHOTO_CROP, productPhotoCropRect } from '../../../apps/admin/src/lib/productPhotoCrop';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('fills wide and tall photos without distortion, centred by default', () => {
  expect(productPhotoCropRect(1920, 1080, DEFAULT_PHOTO_CROP)).toEqual({ x: 480, y: 0, width: 960, height: 1080 });
  expect(productPhotoCropRect(800, 1600, DEFAULT_PHOTO_CROP)).toEqual({ x: 0, y: 350, width: 800, height: 900 });
  expect(productPhotoCropRect(1440, 1620, DEFAULT_PHOTO_CROP)).toEqual({ x: 0, y: 0, width: 1440, height: 1620 });
});
it('keeps every crop inside the source at extreme zoom and positions', () => {
  for (const [width, height] of [[200, 1000], [2000, 300], [1440, 1620]]) {
    for (const zoom of [0, 1, 2, 3, 9]) for (const x of [-10, 0, 50, 100, 120]) for (const y of [0, 50, 100]) {
      const rect = productPhotoCropRect(width!, height!, { mode: 'fill', x, y, zoom });
      expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width! + 0.00001);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height! + 0.00001);
      expect(rect.width / rect.height).toBeCloseTo(8 / 9);
    }
  }
  expect(() => productPhotoCropRect(0, 100, DEFAULT_PHOTO_CROP)).toThrow(/dimensions/);
});
it('original mode returns the same file without decoding or re-encoding', async () => {
  const file = new File(['original'], 'original.png', { type: 'image/png' });
  expect(await cropProductPhoto(file, { ...DEFAULT_PHOTO_CROP, mode: 'original' })).toBe(file);
});
function browserCanvas(fail = false) {
  const drawImage = vi.fn();
  const ctx = { drawImage, imageSmoothingEnabled: false, imageSmoothingQuality: '' };
  const canvas = { width: 0, height: 0, getContext: () => ctx,
    toBlob: vi.fn((done: (blob: Blob | null) => void, type: string) => {
      expect([canvas.width, canvas.height]).toEqual([1440, 1620]);
      done(fail ? null : new Blob(['encoded'], { type }));
    }) };
  vi.stubGlobal('Image', class { naturalWidth = 1920; naturalHeight = 1080; src = ''; decode = async () => {}; });
  vi.stubGlobal('document', { createElement: () => canvas });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  return { canvas, drawImage, revoke };
}
it.each(['image/jpeg', 'image/png'])('exports the preview crop at 1440×1620 and frees resources: %s', async type => {
  const { canvas, drawImage, revoke } = browserCanvas();
  const result = await cropProductPhoto(new File(['source'], 'scene.jpg', { type }), DEFAULT_PHOTO_CROP);
  expect(drawImage.mock.calls[0]!.slice(1)).toEqual([480, 0, 960, 1080, 0, 0, 1440, 1620]);
  expect(result.type).toBe(type === 'image/png' ? 'image/png' : 'image/webp');
  expect(revoke).toHaveBeenCalledWith('blob:test');
  expect([canvas.width, canvas.height]).toEqual([0, 0]);
});
it('releases image resources on encoding failure and stops cancelled batches', async () => {
  const { revoke, canvas } = browserCanvas(true);
  const file = new File(['source'], 'scene.jpg', { type: 'image/jpeg' });
  await expect(cropProductPhoto(file, DEFAULT_PHOTO_CROP)).rejects.toThrow(/Could not crop/);
  expect(revoke).toHaveBeenCalled(); expect(canvas.width).toBe(0);
  const controller = new AbortController(); controller.abort();
  await expect(cropProductPhoto(file, DEFAULT_PHOTO_CROP, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
});
