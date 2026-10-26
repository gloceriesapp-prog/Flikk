import type { ComponentProps } from 'react';
import { Alert, Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SupportScreen } from '../src/features/customer-care/SupportScreen';
import { supportEmailAddress, supportEmailUrl } from '../src/features/customer-care/supportEmail';
const mockApiRequest = jest.fn();
jest.mock('../src/api/client', () => ({ apiRequest: (...args: unknown[]) => mockApiRequest(...args) }));
jest.mock('../src/api/appConfig', () => ({ useAppConfig: () => ({ support: { email: 'hello@gloceries.com' } }), useCopy: () => '' }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ accessToken: null }) }));
const props = { navigation: { goBack: jest.fn(), navigate: jest.fn() }, route: { params: undefined } } as unknown as ComponentProps<typeof SupportScreen>;
beforeEach(() => jest.clearAllMocks());
it('email support is accessible without sign-in and performs no support API requests', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const view = await render(<SupportScreen {...props} />);
  expect(view.getByText('hello@gloceries.com')).toBeTruthy();
  expect(view.queryByPlaceholderText('Tell us which items are affected and what happened…')).toBeNull();
  await fireEvent.press(view.getByText('Email support'));
  await waitFor(() => expect(open).toHaveBeenCalledWith(supportEmailUrl('hello@gloceries.com')));
  expect(mockApiRequest).not.toHaveBeenCalled();
  open.mockRestore();
});
it('shows a usable email address when no mail app can open', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No handler'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = await render(<SupportScreen {...props} />);
  await fireEvent.press(view.getByText('Email support'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Email app unavailable', expect.stringContaining('hello@gloceries.com')));
  expect(mockApiRequest).not.toHaveBeenCalled(); open.mockRestore(); alert.mockRestore();
});
it('rejects header injection and invalid configured email addresses', () => {
  for (const value of [null, 'not-email', 'a@b.com?body=secret', 'a@b.com\r\nBcc:evil@x.com']) expect(supportEmailAddress(value)).toBe('hello@gloceries.com');
});
it('prefills only the selected order reference, with no message or account fields', () => {
  const url = supportEmailUrl('hello@gloceries.com', 'delivery', { orderId: '00000000-0000-4000-8000-000000000001' });
  expect(decodeURIComponent(url)).toContain('Delivery issue — Order 00000000-0000-4000-8000-000000000001');
  expect(url).not.toMatch(/body=|phone=|latitude=|token=/);
});
