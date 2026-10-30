import { AppState } from 'react-native';
import { prefetchImages } from '../src/components/AppImage';

const mockPrefetch = jest.fn(() => Promise.resolve(true));
const mockClearMemoryCache = jest.fn(() => Promise.resolve(true));

jest.mock('expo-image', () => ({
  // Wrapped: the factory runs before the mock fns above are initialised.
  Image: Object.assign(() => null, {
    prefetch: (...args: unknown[]) => mockPrefetch(...(args as [])),
    clearMemoryCache: () => mockClearMemoryCache(),
  }),
}));
// Captures AppImage's module-level memory-warning listener (jest.mock is hoisted above the import).
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  // Lives inside the factory: it runs before this file's own consts exist.
  const listeners: Record<string, () => void> = {};
  actual.AppState.addEventListener = (type: string, cb: () => void) => {
    listeners[type] = cb;
    return { remove: jest.fn() };
  };
  actual.AppState.testListeners = listeners;
  return actual;
});

describe('AppImage memory use', () => {
  it('prefetches to disk only, deduplicated, so nothing is decoded into RAM early', () => {
    prefetchImages(['https://a/1.webp', undefined, 'https://a/1.webp', 'https://a/2.webp']);
    expect(mockPrefetch).toHaveBeenCalledWith(['https://a/1.webp', 'https://a/2.webp'], 'disk');
  });

  it('drops decoded images when the OS reports low memory', () => {
    (AppState as unknown as { testListeners: Record<string, () => void> }).testListeners.memoryWarning();
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1);
  });
});
