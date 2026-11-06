import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StartupWelcome } from '../src/components/StartupWelcome';

jest.mock('expo-image', () => ({ Image: 'WelcomeImage' }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('shows the artwork for 0.9 seconds after it displays, excluding decode time', async () => {
  const onFinished = jest.fn();
  await render(<StartupWelcome onFinished={onFinished} />);
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(onFinished).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId('startup-welcome-artwork'), 'display');
  await act(async () => { jest.advanceTimersByTime(899); });
  expect(onFinished).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(onFinished).toHaveBeenCalledTimes(1);
});

it('cancels the viewing timer when unmounted', async () => {
  const onFinished = jest.fn();
  const { unmount } = await render(<StartupWelcome onFinished={onFinished} />);
  await fireEvent(screen.getByTestId('startup-welcome-artwork'), 'display');
  await unmount();
  await act(async () => { jest.advanceTimersByTime(4000); });
  expect(onFinished).not.toHaveBeenCalled();
});

it('does not trap startup if artwork decoding fails', async () => {
  const onFinished = jest.fn();
  await render(<StartupWelcome onFinished={onFinished} />);
  await fireEvent(screen.getByTestId('startup-welcome-artwork'), 'error', { error: 'decode failed' });
  expect(onFinished).toHaveBeenCalledTimes(1);
});
