import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { RateUsModal } from '../src/screens/profile/components/RateUsModal';
import { apiRequest } from '../src/api/client';
const mockSession = { sessionEpoch: 1 };
jest.mock('../src/api/client', () => ({ apiRequest: jest.fn() }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: (selector: (state: typeof mockSession) => unknown) => selector(mockSession) }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Medium: 'medium' } }));
jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(async () => true), requestReview: jest.fn(async () => {}) }));
beforeEach(() => { jest.clearAllMocks(); mockSession.sessionEpoch = 1; });
it('retains a low-star rating before showing thanks and leaves store review available', async () => {
  jest.mocked(apiRequest).mockResolvedValue({ ok: true });
  const view = await render(<RateUsModal visible onClose={() => {}} />);
  await fireEvent.press(view.getAllByLabelText('Rate star')[0]);
  expect(apiRequest).toHaveBeenCalledWith('/reviews/app', { method: 'POST', body: { rating: 1 } });
  expect(view.getByText('Thanks for the feedback')).toBeTruthy();
  expect(view.getByText('Review us on the app store')).toBeTruthy();
});
it('shows save errors and allows an explicit retry', async () => {
  jest.mocked(apiRequest).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true });
  const view = await render(<RateUsModal visible onClose={() => {}} />);
  await fireEvent.press(view.getAllByLabelText('Rate star')[0]);
  expect(view.getByText('Could not save your rating. Tap a star to retry.')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('Selected star'));
  expect(apiRequest).toHaveBeenCalledTimes(2); expect(view.getByText('Thanks for the feedback')).toBeTruthy();
});
it('does not show a late acknowledgement in the next account session', async () => {
  let complete!: (value: unknown) => void;
  jest.mocked(apiRequest).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  const view = await render(<RateUsModal visible onClose={() => {}} />);
  const saving = fireEvent.press(view.getAllByLabelText('Rate star')[0]);
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  mockSession.sessionEpoch++;
  await view.rerender(<RateUsModal visible onClose={() => {}} />);
  await act(async () => { complete({ ok: true }); await saving; });
  expect(view.queryByText('Thanks for the feedback')).toBeNull();
  expect(view.getByText('Tap a star to rate your experience')).toBeTruthy();
});
