import { act, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { ScreenStatusBar } from '../src/components/ScreenStatusBar';

let mockFocused = true;
let mockMounts = 0;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('expo-status-bar', () => ({
  StatusBar: function MockStatusBar(props: unknown) {
    const React = jest.requireActual<typeof import('react')>('react');
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    React.useEffect(() => { mockMounts += 1; }, []);
    const create = Reflect.get(React, 'createElement');
    return create(View, { ...props as object, testID: 'system-bar-owner' });
  },
}));

beforeEach(() => { jest.clearAllMocks(); mockFocused = true; mockMounts = 0; });
afterEach(() => jest.restoreAllMocks());

it('releases ownership when a screen remains mounted but loses focus', async () => {
  const view = await render(<ScreenStatusBar style="light" />);
  expect(view.getByTestId('system-bar-owner').props.style).toBe('light');
  mockFocused = false;
  await view.rerender(<ScreenStatusBar style="light" />);
  expect(view.queryByTestId('system-bar-owner')).toBeNull();
  mockFocused = true;
  await view.rerender(<ScreenStatusBar style="dark" />);
  expect(view.getByTestId('system-bar-owner').props.style).toBe('dark');
  expect(view.getByTestId('system-bar-owner').props.hidden).toBe(false);
});

it('reapplies visibility and colour when returning from an external payment activity', async () => {
  let changed: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    changed = listener;
    return { remove };
  });
  const view = await render(<ScreenStatusBar style="dark" />);
  expect(mockMounts).toBe(1);
  await act(async () => { changed?.('background'); });
  expect(mockMounts).toBe(1);
  await act(async () => { changed?.('active'); });
  expect(mockMounts).toBe(2);
  await view.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

it('does not acquire a foreground listener for a background navigation screen', async () => {
  mockFocused = false;
  const subscribe = jest.spyOn(AppState, 'addEventListener');
  const view = await render(<ScreenStatusBar style="light" />);
  expect(view.queryByTestId('system-bar-owner')).toBeNull();
  expect(subscribe).not.toHaveBeenCalled();
});
