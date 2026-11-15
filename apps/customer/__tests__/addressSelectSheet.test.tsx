import { fireEvent, render } from '@testing-library/react-native';
import { AddressSelectSheet } from '../src/screens/cart/components/AddressSelectSheet';
import type { ApiAddress } from '../src/api/addresses';
jest.mock('../src/features/delivery-address/mapAddress', () => ({ mapAddressLabel: (address: { map_address: string }) => address.map_address }));
const address: ApiAddress = { id: 'home', label: 'Home', line1: 'Flat 12', landmark: null, recipient_name: 'Customer', recipient_phone: '1234567890', delivery_instructions: null, latitude: 13.3, longitude: 74.7, map_address: 'Katapady, Udupi', is_default: true };
const props = () => ({ visible: true, addresses: [address], selectedId: address.id, selectingId: null, onClose: jest.fn(), onSelect: jest.fn(), onAddNew: jest.fn() });
test('shows the simple picker and selects the actual saved address', async () => {
  const actions = props(); const view = await render(<AddressSelectSheet {...actions} />);
  expect(view.getByRole('header', { name: 'Where Should We Deliver?' })).toBeTruthy();
  expect(view.getByText('Katapady, Udupi')).toBeTruthy();
  expect(view.queryByText('Customer')).toBeNull(); expect(view.queryByText('Selected')).toBeNull();
  expect(view.queryByRole('button', { name: 'More options for Home' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Deliver to Home' }));
  expect(actions.onSelect).toHaveBeenCalledWith(address.id);
});
test('adds a new address without selecting a saved address', async () => {
  const actions = props(); const view = await render(<AddressSelectSheet {...actions} />);
  await fireEvent.press(view.getByRole('button', { name: 'Add new address' }));
  expect(actions.onAddNew).toHaveBeenCalledTimes(1); expect(actions.onSelect).not.toHaveBeenCalled();
});
test('prevents duplicate selection and add actions while switching addresses', async () => {
  const actions = props(); const view = await render(<AddressSelectSheet {...actions} selectingId="home" />);
  await fireEvent.press(view.getByRole('button', { name: 'Deliver to Home' }));
  await fireEvent.press(view.getByRole('button', { name: 'Add new address' }));
  expect(actions.onSelect).not.toHaveBeenCalled(); expect(actions.onAddNew).not.toHaveBeenCalled();
});
