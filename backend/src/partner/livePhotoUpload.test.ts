import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@gloceries/shared', () => ({ createAuthApi: () => ({}) }));
vi.mock('../../../apps/partner/src/api/client', () => ({ apiRequest: api.request, ApiError: class extends Error {} }));
vi.mock('../../../apps/partner/src/api/baseUrl', () => ({ API_BASE_URL: 'https://api.example.com' }));
import { uploadStorePhoto } from '../../../apps/partner/src/api/auth';
beforeEach(() => vi.clearAllMocks());
it('never reports a local photo as a successful upload when the backend is offline', async () => {
  api.request.mockRejectedValue(new Error('offline'));
  await expect(uploadStorePhoto('image-data', 'image/jpeg', 'file:///photo.jpg')).rejects.toThrow('offline');
});
it('uses only the uploaded URL returned by the real API', async () => {
  api.request.mockResolvedValue({ url: 'https://images.example.com/store.webp' });
  await expect(uploadStorePhoto('image-data', 'image/jpeg', 'file:///photo.jpg')).resolves.toEqual({ url: 'https://images.example.com/store.webp' });
  expect(api.request).toHaveBeenCalledWith('/partner/store-photo', { method: 'POST', body: { base64: 'image-data', contentType: 'image/jpeg' } });
});
