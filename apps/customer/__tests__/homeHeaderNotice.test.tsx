import { act, fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { HomeHeaderNotice, HomeRevealSurface, useHomeReveal } from '../src/screens/home/components/HomeReveal';
const mockCopy: Record<string, string> = {};
jest.mock('../src/api/appConfig', () => ({ useCopy: (key: string) => mockCopy[key] ?? ({
  'home.deliveryNotice.highDemand': 'High demand nearby. Delivery may take a little longer.',
  'home.deliveryNotice.rain': 'Rain nearby. Deliveries may take a little longer.',
  'home.deliveryNotice.rainAndDemand': 'Rain and high demand nearby. Delivery may take longer.',
} as Record<string, string>)[key] ?? '' }));
jest.mock('../src/store/useCartStore', () => ({ useCartStore: (selector: (s: unknown) => unknown) => selector({ items: [] }), selectCartTotalQuantity: () => 0 }));
function Trigger() {
  const reveal = useHomeReveal();
  return <Pressable onPress={reveal}><Text>Reveal</Text></Pressable>;
}
beforeEach(() => { jest.useFakeTimers(); Object.keys(mockCopy).forEach(key => delete mockCopy[key]); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
it('only shows confirmed conditions, combines them, and hides each update after four seconds', async () => {
  const view = await render(<HomeHeaderNotice />);
  expect(view.queryByText(/Delivery may|Deliveries may/)).toBeNull();
  mockCopy['home.highDemand.enabled'] = 'true';
  await view.rerender(<HomeHeaderNotice />);
  expect(view.getByText('High demand nearby. Delivery may take a little longer.')).toBeTruthy();
  await act(() => jest.advanceTimersByTime(4000));
  expect(view.queryByText(/High demand nearby/)).toBeNull();
  mockCopy['home.rain.enabled'] = 'true';
  await view.rerender(<HomeHeaderNotice />);
  expect(view.getByText('Rain and high demand nearby. Delivery may take longer.')).toBeTruthy();
  mockCopy['home.highDemand.enabled'] = 'false';
  await view.rerender(<HomeHeaderNotice />);
  expect(view.getByText('Rain nearby. Deliveries may take a little longer.')).toBeTruthy();
  await view.rerender(<HomeHeaderNotice isClosed />);
  expect(view.queryByText(/Rain nearby/)).toBeNull();
});
it('reopens the text summary on tap and restarts the four-second timeout', async () => {
  const view = await render(<HomeRevealSurface><Trigger /><HomeHeaderNotice /></HomeRevealSurface>);
  await fireEvent.press(view.getByText('Reveal'));
  expect(view.getByText('Your cart is empty. Add your favourites to get started.')).toBeTruthy();
  await act(() => jest.advanceTimersByTime(3000));
  await fireEvent.press(view.getByText('Reveal'));
  await act(() => jest.advanceTimersByTime(3000));
  expect(view.getByText(/Your cart is empty/)).toBeTruthy();
  await act(() => jest.advanceTimersByTime(1000));
  expect(view.queryByText(/Your cart is empty/)).toBeNull();
});
