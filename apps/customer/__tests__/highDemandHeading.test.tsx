import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { DeliveryHeading } from '../src/screens/home/components/DeliveryHeading';

let mockFinish: ((finished: boolean) => void) | undefined;
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  __esModule: true,
  default: { View: jest.requireActual('react-native').View, Text: jest.requireActual('react-native').Text },
  useReducedMotion: () => false,
  withDelay: (_delay: number, value: number) => value,
  cancelAnimation: () => {},
  runOnJS: (callback: () => void) => callback,
  withTiming: (value: number, _config: unknown, completion?: (finished: boolean) => void) => {
    mockFinish = completion;
    return value;
  },
}));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));

it('keeps the normal delivery heading and hides demand by default', async () => {
  const view = await render(<DeliveryHeading minutes={29} light />);
  expect(view.queryByLabelText('High demand')).toBeNull();
  expect(view.getByLabelText('Delivery in 29 minutes')).toBeTruthy();
});

it('waits for successful intro completion, keeps full minutes, and responds to the toggle', async () => {
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  const view = await render(<DeliveryHeading minutes={29} light highDemand />);
  expect(view.queryByLabelText('High demand')).toBeNull();
  for (const [text, width] of [['Gloceries ', 100], ['in 29 min', 85], ['In 29 minutes', 150]] as const) {
    await fireEvent(view.getAllByText(text, { includeHiddenElements: true })[0], 'layout', { nativeEvent: { layout: { width } } });
  }
  await fireEvent(view.getByTestId('home-delivery-heading'), 'layout', { nativeEvent: { layout: { width: 230 } } });
  expect(mockFinish).toBeDefined();
  expect(view.queryByLabelText('High demand')).toBeNull();
  await act(() => { mockFinish!(false); });
  expect(view.queryByLabelText('High demand')).toBeNull();
  await act(() => { mockFinish!(true); });
  expect(view.getByLabelText('High demand')).toBeTruthy();
  expect(view.getAllByText('In 29 minutes', { includeHiddenElements: true }).length).toBeGreaterThan(0);
  // A narrow post-intro header still uses the full words with font scaling.
  await fireEvent(view.getByTestId('home-delivery-heading'), 'layout', { nativeEvent: { layout: { width: 125 } } });
  expect(view.getByText('In 29 minutes')).toBeTruthy();
  await view.rerender(<DeliveryHeading minutes={29} light highDemand={false} />);
  expect(view.queryByLabelText('High demand')).toBeNull();
  await view.rerender(<DeliveryHeading minutes={31} light highDemand />);
  expect(view.getByLabelText('High demand')).toBeTruthy();
  expect(view.getByLabelText('Delivery in 31 minutes')).toBeTruthy();
});
