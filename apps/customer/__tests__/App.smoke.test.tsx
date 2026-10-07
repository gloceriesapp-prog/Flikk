import { act, render, screen } from '@testing-library/react-native';
import App from '../App';

// Boot smoke test: the real App tree (providers + RootNavigator) mounts, the
// welcome gate passes, and a logged-out cold start lands on Login.
jest.useFakeTimers();

it('boots to the login screen with no saved session', async () => {
  await render(<App />);
  await act(async () => { jest.advanceTimersByTime(6000); });
  expect(await screen.findByText('Log in or sign up')).toBeTruthy();
});
