import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { ORDER_PLACED_MS, OrderPlacedScreen } from '../src/screens/order-placed/OrderPlacedScreen';

const mockChime = { play: jest.fn(), release: jest.fn() };
jest.mock('../src/payments/paymentChime', () => ({ loadPaymentChime: () => mockChime }));
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(async () => {}), NotificationFeedbackType: { Success: 'success' } }));
jest.mock('../src/components/ScreenStatusBar', () => ({ ScreenStatusBar: () => null }));

type Props = ComponentProps<typeof OrderPlacedScreen>;

async function show(params: Partial<Props['route']['params']> = {}) {
  const reset = jest.fn();
  await render(<OrderPlacedScreen
    navigation={{ reset } as unknown as Props['navigation']}
    route={{ key: 'k', name: 'OrderPlaced', params: { orderId: 'o1', orderNumber: 'GLO-1', amount: 245, paymentMethodLabel: 'UPI', paid: true, estimatedDeliveryMinutes: 29, ...params } } as Props['route']}
  />);
  return reset;
}

const toTracking = { index: 1, routes: [{ name: 'Home' }, { name: 'TrackOrder', params: { orderId: 'o1', paymentMethodLabel: 'UPI', isTrip: undefined } }] };

beforeEach(() => { jest.useFakeTimers(); mockChime.play.mockClear(); });
afterEach(() => jest.useRealTimers());

it('celebrates a paid order with the chime, then opens tracking on its own', async () => {
  const reset = await show();
  expect(screen.getByText('Order Placed Successfully! 🎉')).toBeTruthy();
  expect(screen.getByText('Your groceries are getting ready!')).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(ORDER_PLACED_MS - 1); });
  expect(mockChime.play).toHaveBeenCalledTimes(1);
  expect(reset).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(reset).toHaveBeenCalledWith(toTracking);
});

it('skips straight to tracking on tap, once', async () => {
  const reset = await show();
  await fireEvent.press(screen.getByLabelText('Order placed. Open order tracking'));
  await act(async () => { jest.advanceTimersByTime(ORDER_PLACED_MS); });
  expect(reset).toHaveBeenCalledTimes(1);
});

it('cash on delivery: same message, no payment chime', async () => {
  await show({ paid: false, paymentMethodLabel: 'Cash on delivery' });
  expect(screen.getByText('Order Placed Successfully! 🎉')).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(ORDER_PLACED_MS); });
  expect(mockChime.play).not.toHaveBeenCalled();
});
