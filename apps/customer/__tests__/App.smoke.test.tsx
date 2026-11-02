import { act, fireEvent, render, screen } from '@testing-library/react-native';
import App from '../App';

// Boot smoke test: the real App tree (providers + RootNavigator) mounts, the
// saved state restores in parallel with the welcome, then opens Login.
jest.useFakeTimers();

it('boots to the login screen with no saved session', async () => {
  await render(<App />);
  await act(async () => { jest.advanceTimersByTime(6000); });
  expect(screen.getByLabelText('Welcome to Gloceries')).toBeTruthy();
  await fireEvent(screen.getByTestId('startup-welcome-artwork'), 'display');
  await act(async () => { jest.advanceTimersByTime(3499); });
  expect(screen.queryByText('Log in or sign up')).toBeNull();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(await screen.findByText('Log in or sign up')).toBeTruthy();
  expect(screen.queryByLabelText('Welcome to Gloceries')).toBeNull();
});
