import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ setTokens: vi.fn(), fetch: vi.fn() }));
vi.mock('../../../apps/partner-dashboard/src/lib/authStorage', () => ({ setTokens: m.setTokens, getAccessToken: () => null, getRefreshToken: () => null, clearTokens: vi.fn() }));
import { requestOtp, verifyOtp } from '../../../apps/partner-dashboard/src/lib/authApi';
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', m.fetch); });
it('marks initial and repeated OTP sends as dashboard sign-in', async () => {
  m.fetch.mockImplementation(async () => new Response(JSON.stringify({ ok: true })));
  await requestOtp('+919876543210'); await requestOtp('+919876543210');
  expect(m.fetch).toHaveBeenCalledTimes(2);
  for (const [url, options] of m.fetch.mock.calls) {
    expect(url).toMatch(/\/auth\/partner-dashboard\/otp\/request$/);
    expect(JSON.parse(options.body)).toEqual({ phone: '+919876543210', app: 'partner_dashboard' });
  }
});
it('marks verification and stores tokens only for a partner response', async () => {
  m.fetch.mockResolvedValue(new Response(JSON.stringify({ role: 'store_owner', access_token: 'access', refresh_token: 'refresh' })));
  await verifyOtp('+919876543210', '123456');
  expect(JSON.parse(m.fetch.mock.calls[0][1].body)).toMatchObject({ app: 'partner_dashboard' });
  expect(m.setTokens).toHaveBeenCalledWith('access', 'refresh');
});
it('does not store tokens for a non-partner even if an older backend returns a submitted application', async () => {
  m.fetch.mockResolvedValue(new Response(JSON.stringify({ role: 'customer', application_submitted: true, access_token: 'access', refresh_token: 'refresh' })));
  await expect(verifyOtp('+919876543210', '123456')).rejects.toMatchObject({ code: 'PARTNER_LOGIN_REQUIRED' });
  expect(m.setTokens).not.toHaveBeenCalled();
});
it('fails closed on an older backend instead of falling back to mobile OTP', async () => {
  m.fetch.mockResolvedValue(new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }), { status: 404 }));
  await expect(requestOtp('+919876543210')).rejects.toMatchObject({ status: 404 });
  expect(m.fetch).toHaveBeenCalledTimes(1);
  expect(m.fetch.mock.calls[0][0]).toMatch(/\/auth\/partner-dashboard\/otp\/request$/);
});
