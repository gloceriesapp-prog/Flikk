import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { UdupiModeTip } from '../src/features/onboarding-tips/UdupiModeTip';
import { udupiTabRect } from '../src/features/onboarding-tips/udupiTipLayout';
import { useOnboardingTipsStore } from '../src/features/onboarding-tips/useOnboardingTipsStore';
import { useHomeModeStore } from '../src/screens/home/mode-switch/useHomeModeStore';

beforeEach(() => {
  jest.useFakeTimers();
  useOnboardingTipsStore.setState({ seen: {}, hydrated: true });
  useHomeModeStore.setState({ mode: 'gloceries' });
});
afterEach(() => jest.useRealTimers());

it('finds the Udupi tab: right half of the switch, below the safe area', () => {
  expect(udupiTabRect(390, 47)).toEqual({ x: 201, y: 55, width: 173, height: 36 });
});

it('shows once on first open, and "Show me" switches to Udupi', async () => {
  await render(<UdupiModeTip ready />);
  expect(screen.queryByTestId('udupi-tip')).toBeNull(); // waits for Home to settle
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(screen.getByText('Udupi mode is here')).toBeTruthy();
  expect(useOnboardingTipsStore.getState().seen['udupi-mode']).toBe(true);
  await fireEvent.press(screen.getByText('Show me'));
  expect(useHomeModeStore.getState().mode).toBe('udupi');
  expect(screen.queryByTestId('udupi-tip')).toBeNull();
});

it('never again once seen, and not before saved tips have loaded', async () => {
  useOnboardingTipsStore.setState({ seen: { 'udupi-mode': true } });
  const first = await render(<UdupiModeTip ready />);
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(screen.queryByTestId('udupi-tip')).toBeNull();
  await first.unmount();
  useOnboardingTipsStore.setState({ seen: {}, hydrated: false });
  await render(<UdupiModeTip ready />);
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(screen.queryByTestId('udupi-tip')).toBeNull();
});

it('skipped when the customer is already in Udupi mode', async () => {
  useHomeModeStore.setState({ mode: 'udupi' });
  await render(<UdupiModeTip ready />);
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(screen.queryByTestId('udupi-tip')).toBeNull();
  expect(useOnboardingTipsStore.getState().seen['udupi-mode']).toBe(true);
});

it('arrowhead points along the curve’s end direction', () => {
  const { arrowHead } = jest.requireActual('../src/features/onboarding-tips/udupiTipLayout') as typeof import('../src/features/onboarding-tips/udupiTipLayout');
  // Travelling straight up into (100, 50): both wings sit below the tip, mirrored.
  expect(arrowHead({ x: 100, y: 100 }, { x: 100, y: 50 }, 10)).toBe('M95 58.7 L100 50 L105 58.7');
});
