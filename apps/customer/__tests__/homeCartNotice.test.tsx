import { act, fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { HomeHeaderNotice, HomeRevealSurface, useHomeReveal } from '../src/screens/home/components/HomeReveal';

jest.mock('../src/api/appConfig', () => ({ useCopy: () => '' }));
const mockCart = { items: [] as { id: string; name: string; quantity: number }[], lastAddedItemId: null as string | null };
jest.mock('../src/store/useCartStore', () => ({
  useCartStore: (selector: (state: typeof mockCart) => unknown) => selector(mockCart),
  selectCartTotalQuantity: (state: typeof mockCart) => state.items.reduce((count, item) => count + item.quantity, 0),
}));
function Trigger() {
  const reveal = useHomeReveal();
  return <Pressable accessibilityRole="button" accessibilityLabel="Cart summary" onPress={reveal}><Text>Show</Text></Pressable>;
}
const surface = <HomeRevealSurface><Text>Header</Text><HomeHeaderNotice /><Text>Main content</Text><Trigger /></HomeRevealSurface>;
beforeEach(() => { jest.useFakeTimers(); mockCart.items = []; mockCart.lastAddedItemId = null; });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
it('shows truthful empty-cart copy and dismisses after repeated taps', async () => {
  const view = await render(surface);
  expect(view.queryByText('Your cart is empty. Add your favourites to get started.')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Cart summary' }));
  expect(view.getByText('Your cart is empty. Add your favourites to get started.')).toBeTruthy();
  expect(view.queryByText(/Fresh Milk/)).toBeNull();
  await act(() => jest.advanceTimersByTime(2000));
  await fireEvent.press(view.getByRole('button', { name: 'Cart summary' }));
  await act(() => jest.advanceTimersByTime(1500));
  expect(view.getByText('Your cart is empty. Add your favourites to get started.')).toBeTruthy();
  await act(() => jest.advanceTimersByTime(2500));
  expect(view.queryByText('Your cart is empty. Add your favourites to get started.')).toBeNull();
  await view.unmount();
});
it('uses real cart quantities without sample products', async () => {
  mockCart.items = [{ id: 'tomato', name: 'Tomatoes', quantity: 2 }, { id: 'milk', name: 'Milk', quantity: 1 }];
  mockCart.lastAddedItemId = 'tomato';
  const view = await render(surface);
  await fireEvent.press(view.getByRole('button', { name: 'Cart summary' }));
  expect(view.getByText('3 items in your cart. Ready when you are.')).toBeTruthy();
  await view.unmount();
});
