import { act, fireEvent, render } from '@testing-library/react-native';
import { HomeModeSwitch } from '../src/screens/home/mode-switch/HomeModeSwitch';
import { useHomeModeStore } from '../src/screens/home/mode-switch/useHomeModeStore';
import type { SharedValue } from 'react-native-reanimated';
jest.mock('../src/screens/home/header-theme/homeHeaderTheme', () => ({ useHeaderTint: () => ({ value: '#155DFC' }) }));
jest.mock('../src/screens/home/components/CollapsibleHeaderTop', () => ({ COLLAPSE_DISTANCE: 16 }));
beforeEach(() => useHomeModeStore.setState({ mode: 'gloceries' }));
it('switches modes through the existing store and retains selected tab semantics', async () => {
  const view = await render(<HomeModeSwitch scrollY={{ value: 0 } as SharedValue<number>} />);
  expect(view.getByRole('tab', { name: 'Gloceries', selected: true })).toBeTruthy();
  await fireEvent.press(view.getByRole('tab', { name: 'Udupi' }));
  expect(useHomeModeStore.getState().mode).toBe('udupi');
  expect(view.getByRole('tab', { name: 'Udupi', selected: true })).toBeTruthy();
  await fireEvent.press(view.getByRole('tab', { name: 'Gloceries' }));
  expect(useHomeModeStore.getState().mode).toBe('gloceries');
});
it('captures measured tab width before native layout events are released', async () => {
  const view = await render(<HomeModeSwitch scrollY={{ value: 0 } as SharedValue<number>} />);
  const onLayout = view.getByRole('tab', { name: 'Gloceries' }).props.onLayout;
  await act(() => {
    for (const width of [150, 170]) {
      const event: { nativeEvent: { layout: { width: number } } | null } = { nativeEvent: { layout: { width } } };
      onLayout(event);
      event.nativeEvent = null;
    }
  });
  expect(view.getByRole('tab', { name: 'Gloceries', selected: true })).toBeTruthy();
});
