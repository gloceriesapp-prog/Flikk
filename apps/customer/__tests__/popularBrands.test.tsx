import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PopularBrands } from '../src/screens/categories/components/PopularBrands';
import { fetchPopularBrands } from '../src/api/brands';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('../src/components/AppImage', () => ({ AppImage: require('react-native').Image }));
jest.mock('../src/api/brands', () => ({ fetchPopularBrands: jest.fn() }));
const brands = Array.from({ length: 11 }, (_, i) => ({ id: String(i), name: `Brand ${i}`, imageUrl: `https://example.com/${i}.png` }));
let client: QueryClient;
function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  mockFocused = true;
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
  jest.mocked(fetchPopularBrands).mockResolvedValue(brands.slice(0, 10));
});
afterEach(() => client.clear());

it('refreshes admin changes on returning to Categories while preserving the ten-tile preview', async () => {
  const select = jest.fn(); const seeAll = jest.fn();
  const { rerender } = await render(<PopularBrands onSelect={select} onSeeAll={seeAll} />, { wrapper: Wrapper });
  await screen.findByLabelText('Brand 9');
  expect(screen.queryByLabelText('See all brands')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Brand 3'));
  expect(select).toHaveBeenCalledWith(brands[3]);
  mockFocused = false;
  await rerender(<PopularBrands onSelect={select} onSeeAll={seeAll} />);
  jest.mocked(fetchPopularBrands).mockResolvedValue(brands);
  mockFocused = true;
  await rerender(<PopularBrands onSelect={select} onSeeAll={seeAll} />);
  await screen.findByLabelText('See all brands');
  expect(screen.queryByLabelText('Brand 10')).toBeNull();
  await fireEvent.press(screen.getByLabelText('See all brands'));
  expect(seeAll).toHaveBeenCalledTimes(1);
});

it('shows a retry action after a failed load instead of silently hiding selected brands', async () => {
  jest.mocked(fetchPopularBrands).mockRejectedValue(new Error('Network unavailable'));
  await render(<PopularBrands onSelect={jest.fn()} onSeeAll={jest.fn()} />, { wrapper: Wrapper });
  await screen.findByLabelText('Retry popular brands');
  jest.mocked(fetchPopularBrands).mockResolvedValue(brands.slice(0, 2));
  await fireEvent.press(screen.getByLabelText('Retry popular brands'));
  await screen.findByLabelText('Brand 1');
  expect(screen.queryByLabelText('Retry popular brands')).toBeNull();
});

it('does not fetch while Categories is hidden and hides a genuinely empty selection', async () => {
  mockFocused = false;
  const { rerender } = await render(<PopularBrands onSelect={jest.fn()} onSeeAll={jest.fn()} />, { wrapper: Wrapper });
  expect(fetchPopularBrands).not.toHaveBeenCalled();
  jest.mocked(fetchPopularBrands).mockResolvedValue([]);
  mockFocused = true;
  await rerender(<PopularBrands onSelect={jest.fn()} onSeeAll={jest.fn()} />);
  await waitFor(() => expect(screen.queryByLabelText('Loading popular brands')).toBeNull());
  expect(fetchPopularBrands).toHaveBeenCalled();
  expect(screen.queryByText('Popular brands')).toBeNull();
});
