import { act, renderHook } from '@testing-library/react-native';
import { HOME_LOADER_MAX_MS, useHomeReady } from '../src/screens/home/loading/useHomeReady';

const mockState = { sections: true, tabs: true, picks: true, prefetch: jest.fn(async (_urls: string[], _policy: string) => true) };
jest.mock('../src/screens/home/useHomeSections', () => ({ useHomeSections: () => ({ isPending: mockState.sections }) }));
jest.mock('../src/screens/home/data/useHomeTabs', () => ({ useHomeTabs: () => ({ isResolvingTabs: mockState.tabs }) }));
jest.mock('../src/screens/home/sections/useHomePicks', () => ({
  useHomePicks: () => ({ isPending: mockState.picks, data: { 'everyday-dairy': [{ imageUrl: 'https://img/1.webp' }] } }),
}));
jest.mock('expo-image', () => ({ Image: { prefetch: (urls: string[], policy: string) => mockState.prefetch(urls, policy) } }));

beforeEach(() => { jest.useFakeTimers(); Object.assign(mockState, { sections: true, tabs: true, picks: true }); mockState.prefetch.mockClear(); });
afterEach(() => jest.useRealTimers());

it('is ready on the first render when Home came from the saved copy', async () => {
  Object.assign(mockState, { sections: false, tabs: false, picks: false });
  const { result } = await renderHook(() => useHomeReady(true));
  expect(result.current).toBe(true);
});

it('waits for the data, warms the first row photos, then shows Home', async () => {
  const { result, rerender } = await renderHook(() => useHomeReady(true));
  expect(result.current).toBe(false);
  Object.assign(mockState, { sections: false, tabs: false, picks: false });
  await act(async () => { await rerender({}); });
  expect(mockState.prefetch).toHaveBeenCalledWith(['https://img/1.webp'], 'memory-disk');
  expect(result.current).toBe(true);
});

it('never holds Home longer than the cap', async () => {
  const { result } = await renderHook(() => useHomeReady(true));
  await act(async () => { jest.advanceTimersByTime(HOME_LOADER_MAX_MS - 1); });
  expect(result.current).toBe(false);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(result.current).toBe(true);
});
