import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NammaBrandsSection, pillParts, twoLineTitle } from '../src/screens/home/namma-brands/NammaBrandsSection';
import { fetchNammaBrands, type NammaBrandCard } from '../src/api/brands';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../src/components/AppImage', () => ({ AppImage: jest.requireActual('react-native').Image }));
jest.mock('../src/api/brands', () => ({ fetchNammaBrands: jest.fn() }));
jest.mock('../src/store/useLocationStore', () => ({ useLocationStore: (select: (s: unknown) => unknown) => select({ location: { latitude: 13.3, longitude: 74.7 } }) }));

const card = (i: number): NammaBrandCard => ({
  brand: { id: `b${i}`, name: `Brand ${i}`, imageUrl: `https://example.com/b${i}.png` },
  title: `Brand ${i}`, imageUrls: [`https://example.com/p${i}.png`], pill: `Upto ${10 + i}% Off`,
});
let client: QueryClient;
function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => client.clear());

it('hides the whole block with fewer than 3 cards', async () => {
  jest.mocked(fetchNammaBrands).mockResolvedValue({ enabled: true, headerImageUrl: null, cards: [card(1), card(2)] });
  const view = await render(<NammaBrandsSection enabled />, { wrapper: Wrapper });
  await waitFor(() => expect(fetchNammaBrands).toHaveBeenCalled());
  await waitFor(() => expect(view.toJSON()).toBeNull());
});

it('renders nothing (not even a skeleton) when switched off', async () => {
  const view = await render(<NammaBrandsSection enabled={false} />, { wrapper: Wrapper });
  expect(view.toJSON()).toBeNull();
  expect(fetchNammaBrands).not.toHaveBeenCalled();
});

it('shows the brand cards, and a tap opens that brand', async () => {
  jest.mocked(fetchNammaBrands).mockResolvedValue({ enabled: true, headerImageUrl: null, cards: [card(1), card(2), card(3)] });
  await render(<NammaBrandsSection enabled />, { wrapper: Wrapper });
  await screen.findByText('Brand\n2');
  await fireEvent.press(screen.getByTestId('namma-card-b2'));
  expect(mockNavigate).toHaveBeenCalledWith('BrandProducts', { brand: card(2).brand });
});

it('puts every title on two lines, split near the middle', () => {
  expect(twoLineTitle('Shetty Masala')).toBe('Shetty\nMasala');
  expect(twoLineTitle('Karavali Coconut Oil')).toBe('Karavali\nCoconut Oil');
  expect(twoLineTitle('  Udupi   Snacks ')).toBe('Udupi\nSnacks');
  expect(twoLineTitle('Nandini')).toBe('Nandini');
});

it('splits the offer pill into a lead and a bold value', () => {
  expect(pillParts('Upto 20% Off')).toEqual({ lead: 'Up to', value: '20% OFF' });
  expect(pillParts('Starting from ₹35')).toEqual({ lead: 'Starting at', value: '₹35' });
  expect(pillParts('New')).toEqual({ lead: '', value: 'New' });
  expect(pillParts('  ')).toBeNull();
});

