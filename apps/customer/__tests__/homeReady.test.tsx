import { renderHook } from '@testing-library/react-native';
import { useHomeReady } from '../src/screens/home/loading/useHomeReady';

const mockState = { picks: true, prefetch: jest.fn() };
jest.mock('../src/screens/home/sections/useHomePicks', () => ({
  useHomePicks: () => ({ isPending: mockState.picks, data: { 'everyday-dairy': [{ imageUrl: 'https://img/1.webp' }] } }),
}));
jest.mock('expo-image', () => ({ Image: { prefetch: (urls: string[], policy: string) => mockState.prefetch(urls, policy) } }));
beforeEach(() => { mockState.picks = true; mockState.prefetch.mockReset().mockResolvedValue(true); });

it('shows Home immediately after coverage even while feeds or image warming are pending', async () => {
  mockState.prefetch.mockReturnValue(new Promise(() => {}));
  const { result } = await renderHook(() => useHomeReady(true));
  expect(result.current).toBe(true);
  expect(mockState.prefetch).toHaveBeenCalledWith(['https://img/1.webp'], 'memory-disk');
});
it('keeps coverage authoritative and never prefetches without it', async () => {
  const { result } = await renderHook(() => useHomeReady(false));
  expect(result.current).toBe(false);
  expect(mockState.prefetch).not.toHaveBeenCalled();
});
it('does not block Home when image warming fails', async () => {
  mockState.prefetch.mockRejectedValue(new Error('offline'));
  const { result } = await renderHook(() => useHomeReady(true));
  expect(result.current).toBe(true);
});
