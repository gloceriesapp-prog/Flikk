import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetbankingBankPicker } from '../src/screens/payment-method/components/NetbankingBankPicker';
import { fetchNetbankingBanks } from '../src/api/payments';
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/api/payments', () => ({ fetchNetbankingBanks: jest.fn() }));
const fetchBanks = jest.mocked(fetchNetbankingBanks);
afterEach(() => jest.resetAllMocks());
function picker(onSelect = jest.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={client}><NetbankingBankPicker visible onClose={jest.fn()} onSelect={onSelect} /></QueryClientProvider>);
}
it('shows only provider banks, filters by name and returns the selected code', async () => {
  fetchBanks.mockResolvedValue({ banks: [{ code: 'HDFC', name: 'HDFC Bank' }, { code: 'SBIN', name: 'State Bank of India' }] });
  const onSelect = jest.fn(); const view = await picker(onSelect);
  await waitFor(() => expect(view.getByLabelText('Select HDFC Bank')).toBeTruthy());
  await fireEvent.changeText(view.getByLabelText('Search banks'), 'state');
  expect(view.queryByLabelText('Select HDFC Bank')).toBeNull();
  await fireEvent.press(view.getByLabelText('Select State Bank of India'));
  expect(onSelect).toHaveBeenCalledWith({ code: 'SBIN', name: 'State Bank of India' });
});
it('offers retry on failure without invented bank options', async () => {
  fetchBanks.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ banks: [] });
  const view = await picker();
  await waitFor(() => expect(view.getByText('Retry banks')).toBeTruthy());
  expect(view.queryByLabelText('Select HDFC Bank')).toBeNull();
  await fireEvent.press(view.getByText('Retry banks'));
  await waitFor(() => expect(view.getByText('Netbanking is unavailable right now. Choose another payment method.')).toBeTruthy());
});

it('groups popular available banks first without duplicates or unavailable choices', async () => {
  fetchBanks.mockResolvedValue({ banks: [{ code: 'AIRP', name: 'Airtel Payments Bank' }, { code: 'HDFC', name: 'HDFC Bank' }] });
  const view = await picker();
  await waitFor(() => expect(view.getByText('Popular banks')).toBeTruthy());
  expect(view.getByText('All other banks')).toBeTruthy();
  expect(view.getByTestId('popular-banks-grid')).toBeTruthy();
  expect(view.getAllByLabelText('Select HDFC Bank')).toHaveLength(1);
  expect(view.queryByLabelText('Select State Bank of India')).toBeNull();
  expect(view.queryByText(/Select a bank available through Razorpay/)).toBeNull();
});
