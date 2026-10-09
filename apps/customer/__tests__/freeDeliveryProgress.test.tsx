import { render } from '@testing-library/react-native';
import { FreeDeliveryProgressCard } from '../src/screens/cart/components/FreeDeliveryProgressCard';
const mockSettings = { freeDeliveryEnabled: true, freeDeliveryThreshold: 199 };
jest.mock('../src/api/deliverySettings', () => ({ useDeliverySettings: () => ({ data: mockSettings }) }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
beforeEach(() => { mockSettings.freeDeliveryEnabled = true; mockSettings.freeDeliveryThreshold = 199; });
it('does not advertise a disabled offer', async () => {
  mockSettings.freeDeliveryEnabled = false;
  const view = await render(<FreeDeliveryProgressCard itemTotal={250} />);
  expect(view.queryByText('You unlocked free delivery')).toBeNull();
});
it('shows the actual remaining money and keeps handling fees explicit', async () => {
  const view = await render(<FreeDeliveryProgressCard itemTotal={149.5} />);
  expect(view.getByText('Add ₹49.50 more for free delivery')).toBeTruthy();
  expect(view.getByText('Handling fees still apply.')).toBeTruthy();
});
it('shows unlocked delivery at a zero threshold without dividing by zero', async () => {
  mockSettings.freeDeliveryThreshold = 0;
  const view = await render(<FreeDeliveryProgressCard itemTotal={1} />);
  expect(view.getByText('You unlocked free delivery')).toBeTruthy();
});
