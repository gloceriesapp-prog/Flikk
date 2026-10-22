import { fireEvent, render } from '@testing-library/react-native';
import { BankLogo } from '../src/screens/payment-method/components/BankLogo';
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/AppImage', () => ({ AppImage: jest.requireActual('react-native').Image }));
it('uses the Razorpay bank logo and falls back when an image fails', async () => {
  const view = await render(<BankLogo code="HDFC" />);
  expect(view.getByTestId('bank-logo-HDFC').props.source.uri).toBe('https://cdn.razorpay.com/bank/HDFC.gif');
  await fireEvent(view.getByTestId('bank-logo-HDFC'), 'error', { error: 'not found' });
  expect(view.getByTestId('bank-logo-fallback')).toBeTruthy();
  await view.rerender(<BankLogo code="SBIN" />);
  expect(view.getByTestId('bank-logo-SBIN')).toBeTruthy();
});
it('rejects invalid codes instead of loading arbitrary image paths', async () => {
  const view = await render(<BankLogo code="../other" />);
  expect(view.getByTestId('bank-logo-fallback')).toBeTruthy();
});
