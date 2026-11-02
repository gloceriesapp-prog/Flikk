import { apiRequest } from '../src/api/client';
import { fetchPaymentCustomer } from '../src/api/payments';
jest.mock('../src/api/client', () => ({ apiRequest: jest.fn() }));
beforeEach(() => jest.resetAllMocks());
it('fetches only the account phone when email is optional', async () => {
  jest.mocked(apiRequest).mockResolvedValue({ phone: '+919000000000' });
  await expect(fetchPaymentCustomer({ includeEmail: false })).resolves.toEqual({ email: null, contact: '+919000000000' });
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith('/auth/me');
});
it('preserves contact lookup for merchants requiring an email', async () => {
  jest.mocked(apiRequest).mockImplementation(async path => path === '/payments/contact'
    ? { email: 'real@example.com', required: true } : { phone: '+919000000000' });
  await expect(fetchPaymentCustomer()).resolves.toEqual({ email: 'real@example.com', contact: '+919000000000' });
  expect(apiRequest).toHaveBeenCalledWith('/payments/contact');
});
