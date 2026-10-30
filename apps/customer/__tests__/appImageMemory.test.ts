import { AppState } from 'react-native';

const mockPrefetch = jest.fn(() => Promise.resolve(true));
const mockClearMemoryCache = jest.fn(() => Promise.resolve(true));
jest.mock('expo-image', () => ({
  Image: Object.assign(() => null, { prefetch: mockPrefetch, clearMemoryCache: mockClearMemoryCache }),
}));

const listeners: Record<string, () => void> = {};
jest.spyOn(AppState, 'addEventListener').mockImplementation(((type: string, cb: () => void) => {
  listeners[type] = cb;
  return { remove: jest.fn() };
}) as never);

// Loaded after the spy so its module-level memory-warning listener is captured.
const { prefetchImages } = require('../src/components/AppImage') as typeof import('../src/components/AppImage');

describe('AppImage memory use', () => {
  it('prefetches to disk only, deduplicated, so nothing is decoded into RAM early', () => {
    prefetchImages(['https://a/1.webp', undefined, 'https://a/1.webp', 'https://a/2.webp']);
    expect(mockPrefetch).toHaveBeenCalledWith(['https://a/1.webp', 'https://a/2.webp'], 'disk');
  });

  it('drops decoded images when the OS reports low memory', () => {
    listeners.memoryWarning();
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1);
  });
});
