import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { fetchPaymentContact, savePaymentContact } from '../src/api/payments';
import { usePaymentReceiptEmail } from '../src/payments/usePaymentReceiptEmail';
let mockEpoch = 1;
jest.mock('../src/api/payments', () => ({ fetchPaymentContact: jest.fn(), savePaymentContact: jest.fn() }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: Object.assign(
  (selector: (state: { sessionEpoch: number }) => unknown) => selector({ sessionEpoch: mockEpoch }),
  { getState: () => ({ sessionEpoch: mockEpoch }) },
) }));
function Harness({ onReady }: { onReady: (email: string | null) => void }) {
  const gate = usePaymentReceiptEmail();
  return <><Pressable accessibilityRole="button" onPress={() => { void gate.requestEmail().then(onReady); }}><Text>Start UPI</Text></Pressable>{gate.emailForm}</>;
}
beforeEach(() => {
  jest.clearAllMocks(); mockEpoch = 1;
  jest.mocked(fetchPaymentContact).mockResolvedValue({ email: null, required: true });
  jest.mocked(savePaymentContact).mockImplementation(async email => ({ email, required: true }));
});
it('waits for a real receipt email and explicit save before continuing checkout', async () => {
  const next = jest.fn(); const view = await render(<Harness onReady={next} />);
  await fireEvent.press(view.getByText('Start UPI'));
  await waitFor(() => expect(view.getByLabelText('Payment receipt email')).toBeTruthy());
  expect(next).not.toHaveBeenCalled();
  await fireEvent.changeText(view.getByLabelText('Payment receipt email'), 'login+synthetic@gloceries.com');
  expect(view.getByLabelText('Save receipt email and continue').props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(view.getByLabelText('Payment receipt email'), ' REAL@Example.com ');
  await fireEvent.press(view.getByLabelText('Save receipt email and continue'));
  await waitFor(() => expect(next).toHaveBeenCalledWith('real@example.com'));
  expect(savePaymentContact).toHaveBeenCalledWith('real@example.com');
});
it('cancelling never saves contact or continues a payment', async () => {
  const next = jest.fn(); const view = await render(<Harness onReady={next} />);
  await fireEvent.press(view.getByText('Start UPI'));
  await waitFor(() => expect(view.getByText('Not now')).toBeTruthy());
  await fireEvent.press(view.getByText('Not now'));
  expect(next).toHaveBeenCalledWith(null); expect(savePaymentContact).not.toHaveBeenCalled();
});
it('reuses a saved receipt email without asking again', async () => {
  jest.mocked(fetchPaymentContact).mockResolvedValue({ email: 'saved@example.com', required: true });
  const next = jest.fn(); const view = await render(<Harness onReady={next} />);
  await fireEvent.press(view.getByText('Start UPI'));
  await waitFor(() => expect(next).toHaveBeenCalledWith('saved@example.com'));
  expect(view.queryByLabelText('Payment receipt email')).toBeNull();
  expect(savePaymentContact).not.toHaveBeenCalled();
});
it('keeps a failed save on the form and does not start payment', async () => {
  jest.mocked(savePaymentContact).mockRejectedValue(new Error('offline'));
  const next = jest.fn(); const view = await render(<Harness onReady={next} />);
  await fireEvent.press(view.getByText('Start UPI'));
  await waitFor(() => expect(view.getByLabelText('Payment receipt email')).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText('Payment receipt email'), 'real@example.com');
  await fireEvent.press(view.getByLabelText('Save receipt email and continue'));
  await waitFor(() => expect(view.getByText('Could not save your email. Please try again.')).toBeTruthy());
  expect(next).not.toHaveBeenCalled();
});
it('clears the form and cancels continuation when the signed-in account changes', async () => {
  const next = jest.fn(); const view = await render(<Harness onReady={next} />);
  await fireEvent.press(view.getByText('Start UPI'));
  await waitFor(() => expect(view.getByLabelText('Payment receipt email')).toBeTruthy());
  mockEpoch = 2; await view.rerender(<Harness onReady={next} />);
  expect(next).toHaveBeenCalledWith(null); expect(savePaymentContact).not.toHaveBeenCalled();
  expect(view.queryByLabelText('Payment receipt email')).toBeNull();
});
