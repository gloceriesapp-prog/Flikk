import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSimilarProducts } from '../src/components/ProductDetailSheet/useSimilarProducts';
import { apiRequest } from '../src/api/client';

jest.mock('../src/api/client', () => ({ apiRequest: jest.fn() }));
jest.mock('../src/api/products', () => ({ mapApiProduct: (product: unknown) => product }));
jest.mock('../src/store/useLocationStore', () => ({ useLocationStore: (select: (state: unknown) => unknown) =>
  select({ location: { latitude: 0, longitude: 0 } }) }));
let client: QueryClient;
function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  jest.mocked(apiRequest).mockResolvedValue({ products: [{ id: 'related' }], nextCursor: null });
});
afterEach(() => client.clear());

it('loads recommendations for a brand product without a category label', async () => {
  const { result } = await renderHook(() => useSimilarProducts(undefined, 'product-id', 'store-id', true), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(apiRequest).toHaveBeenCalledWith('/stores/products/similar/page?exclude=product-id&limit=12', { auth: false });
  expect(result.current.data?.pages[0].products).toEqual([{ id: 'related' }]);
});

it('does not request recommendations for unopened product cards', async () => {
  await renderHook(() => useSimilarProducts('Drinks', 'product-id', 'store-id', false), { wrapper: Wrapper });
  expect(apiRequest).not.toHaveBeenCalled();
});
