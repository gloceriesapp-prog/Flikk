import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import type { ApiOrder } from '../src/api/orders';
import { DeliveryRiderCard } from '../src/screens/track-order/components/DeliveryRiderCard';

jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/AppImage', () => ({ AppImage: () => null }));

const order = {
  status: 'out_for_delivery',
  riders: { name: 'Aarav', deliveries: 128, phone: '91 12345-67890' },
} as ApiOrder;

afterEach(() => jest.restoreAllMocks());

it('shows the assigned rider’s number and opens the native dialer', async () => {
  const dial = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const view = await render(<DeliveryRiderCard order={order} />);

  expect(view.getByText('Aarav')).toBeTruthy();
  expect(view.getByText('128 deliveries')).toBeTruthy();
  expect(view.getByText('+91 12345 67890')).toBeTruthy();
  expect(view.queryByText('Chat')).toBeNull();

  await fireEvent.press(view.getByRole('button', { name: 'Call rider at +91 12345 67890' }));
  expect(dial).toHaveBeenCalledWith('tel:+911234567890');
});

it('disables calling when the rider has no usable number', async () => {
  const view = await render(<DeliveryRiderCard order={{ ...order, riders: { ...order.riders!, phone: '' } }} />);
  expect(view.getByRole('button', { name: 'Call rider', disabled: true })).toBeTruthy();
});
