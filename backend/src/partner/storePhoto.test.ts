import { expect, it } from 'vitest';
import { authenticatedPhotoSource, selectStorePhoto } from '../../../apps/partner/src/media/storePhoto';
it('uses the uploaded public photo and falls back to the onboarding photo on failure', () => {
  expect(selectStorePhoto('/public', '/private', [])).toEqual({ uri: '/public', private: false });
  expect(selectStorePhoto('/public', '/private', ['/public'])).toEqual({ uri: '/private', private: true });
});
it('shows a placeholder only if no real photo loads, and attempts changed photos', () => {
  expect(selectStorePhoto(null, null, [])).toBeNull();
  expect(selectStorePhoto(null, '/private', ['/private'])).toBeNull();
  expect(selectStorePhoto('/new', '/private', ['/old', '/private'])?.uri).toBe('/new');
});

it('sends authentication to the backend document endpoint, never a public CDN', () => {
  expect(authenticatedPhotoSource('/partner/documents/photo', 'token', 'https://api.example.com')).toEqual({ uri: 'https://api.example.com/partner/documents/photo', headers: { Authorization: 'Bearer token' } });
  expect(authenticatedPhotoSource('https://images.example.com/store.webp', 'token', 'https://api.example.com').headers).toBeUndefined();
  expect(authenticatedPhotoSource('/partner/documents/photo', null, 'https://api.example.com').headers).toBeUndefined();
});
