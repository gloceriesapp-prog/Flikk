import { fireEvent, render } from '@testing-library/react-native';
import { CartDeliveryAddressCard } from '../src/screens/cart/components/CartDeliveryAddressCard';
import type { ApiAddress } from '../src/api/addresses';

jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/icons/iconly', () => ({ IconlyHome: () => null }));
const address = { id: 'home', label: 'Home', recipient_name: 'Shashikala', line1: '4-79(1), Subhashnagara, Udupi', landmark: 'Near the school', recipient_phone: '9945147769', latitude: 12.9, longitude: 74.7, map_address: 'Map pin locality only' } as ApiAddress;

it('shows the saved recipient and phone alongside the map address', async () => {
  const onChange = jest.fn();
  const view = await render(<CartDeliveryAddressCard loading={false} address={address} onChange={onChange} onAdd={jest.fn()} />);
  expect(view.getByText('Shashikala')).toBeTruthy();
  expect(view.getByText('Map pin locality only')).toBeTruthy();
  expect(view.queryByText('4-79(1), Subhashnagara, Udupi, Near the school')).toBeNull();
  expect(view.getByText('9945147769')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Change delivery address' }));
  expect(onChange).toHaveBeenCalledTimes(1);
});
it('offers address creation when no saved address matches the selected location', async () => {
  const onAdd = jest.fn();
  const view = await render(<CartDeliveryAddressCard loading={false} address={null} onChange={jest.fn()} onAdd={onAdd} />);
  await fireEvent.press(view.getByRole('button', { name: 'Add delivery address' }));
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(view.queryByText('Change')).toBeNull();
});
it('does not offer address creation while the address book is still loading', async () => {
  const view = await render(<CartDeliveryAddressCard loading address={null} onChange={jest.fn()} onAdd={jest.fn()} />);
  expect(view.getByText('Loading delivery address…')).toBeTruthy();
  expect(view.queryByRole('button')).toBeNull();
});

it('uses the latest map label only for the matching selected pin', async () => {
  const location = { latitude: 12.9, longitude: 74.7, addressLabel: 'Freshly resolved map address', city: 'Udupi' };
  const props = { loading: false, address, onChange: jest.fn(), onAdd: jest.fn() };
  const view = await render(<CartDeliveryAddressCard {...props} location={location} />);
  expect(view.getByText('Freshly resolved map address')).toBeTruthy();
  await view.rerender(<CartDeliveryAddressCard {...props} location={{ ...location, latitude: 13.5 }} />);
  expect(view.getByText('Map pin locality only')).toBeTruthy();
  expect(view.queryByText('Freshly resolved map address')).toBeNull();
});
