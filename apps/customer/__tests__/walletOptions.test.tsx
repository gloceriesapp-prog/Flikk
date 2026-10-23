import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletOptions } from '../src/screens/payment-method/components/WalletOptions';
import { fetchAvailableWallets } from '../src/api/payments';
import { availablePaymentMethod } from '../src/payments/paymentMethod';
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/AppImage', () => ({ AppImage: jest.requireActual('react-native').Image }));
jest.mock('../src/api/payments', () => ({ fetchAvailableWallets: jest.fn() }));
const fetchWallets = jest.mocked(fetchAvailableWallets);
afterEach(() => jest.resetAllMocks());
function chooser(onSelect = jest.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={client}><WalletOptions method="wallet:mobikwik" onSelect={onSelect} /></QueryClientProvider>);
}
it('shows only enabled supported wallets and selects the exact wallet', async () => {
  fetchWallets.mockResolvedValue({ wallets: [{ code: 'mobikwik', name: 'MobiKwik' }, { code: 'olamoney', name: 'Ola Money' }, { code: 'payzapp', name: 'PayZapp' } as never] });
  const onSelect = jest.fn(); const view = await chooser(onSelect);
  await waitFor(() => expect(view.getByLabelText('Link Ola Money account')).toBeTruthy());
  expect(view.queryByText('PayZapp')).toBeNull();
  expect(view.queryByText('Pay securely with Razorpay')).toBeNull();
  await fireEvent.press(view.getByLabelText('Link Ola Money account'));
  expect(onSelect).not.toHaveBeenCalled();
  await fireEvent.changeText(view.getByLabelText('Ola Money mobile number'), '9000000000');
  await fireEvent.press(view.getByLabelText('Continue with wallet Ola Money'));
  expect(onSelect).toHaveBeenCalledWith('wallet:olamoney', '+919000000000');
});
it('offers retry without selectable wallets on failure or empty response', async () => {
  fetchWallets.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ wallets: [] });
  const view = await chooser();
  await waitFor(() => expect(view.getByText('Retry wallets')).toBeTruthy());
  expect(view.queryByLabelText('Link MobiKwik account')).toBeNull();
  await fireEvent.press(view.getByText('Retry wallets'));
  await waitFor(() => expect(view.getByText('Wallets are unavailable right now. Choose another payment method.')).toBeTruthy());
});
it('drops Pay Later and disabled online preferences', () => {
  expect(availablePaymentMethod('paylater:getsimpl', [], { cod: true, online: true })).toBeNull();
  expect(availablePaymentMethod('wallet:mobikwik', [], { cod: true, online: false })).toBeNull();
  expect(availablePaymentMethod('wallet:olamoney', [], { cod: true, online: true })).toBe('wallet:olamoney');
});

it('does not select or verify a wallet with an invalid mobile number', async () => {
  fetchWallets.mockResolvedValue({ wallets: [{ code: 'mobikwik', name: 'MobiKwik' }, { code: 'olamoney', name: 'Ola Money' }] });
  const onSelect = jest.fn(); const view = await chooser(onSelect);
  await waitFor(() => expect(view.getByLabelText('Link MobiKwik account')).toBeTruthy());
  await fireEvent.press(view.getByLabelText('Link MobiKwik account'));
  await fireEvent.changeText(view.getByLabelText('MobiKwik mobile number'), '123');
  expect(view.getByLabelText('Continue with wallet MobiKwik').props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(view.getByLabelText('Continue with wallet MobiKwik'));
  expect(onSelect).not.toHaveBeenCalled();
  await fireEvent.press(view.getByLabelText('Link Ola Money account'));
  expect(view.queryByLabelText('MobiKwik mobile number')).toBeNull();
  expect(view.getByLabelText('Ola Money mobile number').props.value).toBe('');
});
