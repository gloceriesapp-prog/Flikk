import { render } from '@testing-library/react-native';
import { DeliveryHeading } from '../src/screens/home/components/DeliveryHeading';

jest.mock('react-native-reanimated', () => ({ ...jest.requireActual('react-native-reanimated'), useReducedMotion: () => false }));

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));

it('keeps the normal delivery heading and hides demand by default', async () => {
  const view = await render(<DeliveryHeading minutes={29} light />);
  expect(view.queryByLabelText('High demand')).toBeNull();
  expect(view.getByLabelText('Delivery in 29 minutes')).toBeTruthy();
});

it('shows the demand badge alongside a compact ETA and removes it when switched off', async () => {
  const view = await render(<DeliveryHeading minutes={29} light highDemand />);
  expect(view.getByLabelText('High demand')).toBeTruthy();
  expect(view.getAllByText('In 29 min').length).toBeGreaterThan(0);
  await view.rerender(<DeliveryHeading minutes={29} light highDemand={false} />);
  expect(view.queryByLabelText('High demand')).toBeNull();
});
