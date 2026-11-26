import { fireEvent, render } from '@testing-library/react-native';
import { LocationDetailsCard } from '../src/screens/address/components/LocationDetailsCard';
import { buildingFromSavedAddress } from '../src/screens/address/addressFormDetails';

it('shows only three fields and keeps locality tied to the map', async () => {
  const onChangePin = jest.fn();
  const view = await render(<LocationDetailsCard building="4B, Shanti Nivas" area="Yenna Gudde, Udupi" landmark="Near school" onChangeBuilding={jest.fn()} onChangeLandmark={jest.fn()} onChangePin={onChangePin} />);
  expect(view.getAllByLabelText(/^(House\/flat number\/building name|Area\/sector\/locality|Landmark)$/)).toHaveLength(3);
  expect(view.getByLabelText('Area/sector/locality').props).toMatchObject({ value: 'Yenna Gudde, Udupi', editable: false });
  expect(view.queryByText('Floor & entrance directions')).toBeNull();
  expect(view.queryByText('Location selected on map')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Change map location' }));
  expect(onChangePin).toHaveBeenCalledTimes(1);
});
it('preserves saved building details and avoids adding the locality twice on edit', () => {
  expect(buildingFromSavedAddress('4B, Shanti Nivas, Yenna Gudde, Udupi', 'Yenna Gudde, Udupi')).toBe('4B, Shanti Nivas');
  expect(buildingFromSavedAddress('Legacy building, Temple Road', 'Yenna Gudde, Udupi')).toBe('Legacy building, Temple Road');
  expect(buildingFromSavedAddress('4B, Shanti Nivas', '')).toBe('4B, Shanti Nivas');
});
