import { beforeEach, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({ razorpayKeyId: 'rzp_live_example', razorpayKeySecret: 'server-secret', razorpayEnv: 'live' }));
vi.mock('../config/env.js', () => ({ env: config }));
vi.mock('../db/supabase.js', () => ({ supabase: {} }));
import { parseUpiValidationInput, validatePartnerUpi } from './upiValidation.js';
const provider = vi.fn();
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => {
  vi.stubGlobal('fetch', provider); provider.mockReset();
  config.razorpayEnv = 'live'; config.razorpayKeySecret = 'server-secret';
});
it('validates syntax before any provider request and normalizes case', () => {
  expect(parseUpiValidationInput({ upiId: ' Person@OKAxis ' })).toBe('person@okaxis');
  for (const upiId of ['', 'name', 'name@@bank', 'name @bank', {}, 'a@b']) expect(() => parseUpiValidationInput({ upiId })).toThrow();
  expect(provider).not.toHaveBeenCalled();
});
it('calls only the validation endpoint without amounts or fund accounts', async () => {
  provider.mockResolvedValue(response({ vpa: 'person@bank', success: true, customer_name: ' Person Name ' }));
  await expect(validatePartnerUpi('owner', { upiId: 'person@bank' })).resolves.toEqual({ upiId: 'person@bank', valid: true, registeredName: 'Person Name' });
  const [url, options] = provider.mock.calls[0];
  expect(url).toBe('https://api.razorpay.com/v1/payments/validate/vpa');
  expect(options.method).toBe('POST'); expect(JSON.parse(options.body)).toEqual({ vpa: 'person@bank' });
  expect(options.redirect).toBe('error'); expect(options.signal).toBeInstanceOf(AbortSignal);
});
it('never returns a name for an invalid ID and never invents a missing name', async () => {
  provider.mockResolvedValueOnce(response({ vpa: 'person@bank', success: false, customer_name: 'Ignore this name' }));
  await expect(validatePartnerUpi('owner', { upiId: 'person@bank' })).resolves.toEqual({ upiId: 'person@bank', valid: false, registeredName: null });
  provider.mockResolvedValueOnce(response({ vpa: 'person@bank', success: true }));
  await expect(validatePartnerUpi('owner', { upiId: 'person@bank' })).resolves.toMatchObject({ valid: true, registeredName: null });
});
it('rejects malformed or mismatched provider responses', async () => {
  for (const body of [null, {}, { success: 'true', vpa: 'person@bank' }, { success: true, vpa: 'different@bank' }, { success: true, vpa: 'person@bank', customer_name: 'bad\u0000name' }]) {
    provider.mockResolvedValueOnce(response(body));
    await expect(validatePartnerUpi('owner', { upiId: 'person@bank' })).rejects.toMatchObject({ code: 'UPI_VALIDATION_UNAVAILABLE' });
  }
});
it('reports unavailable access without declaring the UPI ID invalid', async () => {
  for (const status of [401, 403, 404]) {
    provider.mockResolvedValueOnce(response({ error: { description: 'private detail' } }, status));
    await expect(validatePartnerUpi('owner', { upiId: 'person@bank' })).rejects.toMatchObject({ code: 'UPI_VALIDATION_NOT_ENABLED', status: 503 });
  }
});
it('sanitizes outages and timeouts instead of fabricating an invalid result', async () => {
  for (const status of [400, 429, 500]) {
    provider.mockResolvedValueOnce(response({ error: { description: 'private payload' } }, status));
    await expect(validatePartnerUpi('owner', { upiId: 'person@bank' })).rejects.toMatchObject({ code: 'UPI_VALIDATION_UNAVAILABLE', status: 503 });
  }
  provider.mockRejectedValueOnce(new Error('secret in provider error'));
  await expect(validatePartnerUpi('owner', { upiId: 'person@bank' })).rejects.toThrow('UPI verification is unavailable.');
});
it('refuses missing and simulated test credentials without a provider request', async () => {
  config.razorpayKeySecret = '';
  await expect(validatePartnerUpi('owner', { upiId: 'person@bank' })).rejects.toMatchObject({ status: 503 });
  config.razorpayKeySecret = 'secret'; config.razorpayEnv = 'test';
  await expect(validatePartnerUpi('owner', { upiId: 'person@bank' })).rejects.toMatchObject({ code: 'UPI_VALIDATION_REQUIRES_LIVE' });
  expect(provider).not.toHaveBeenCalled();
});
it('coalesces owner-specific in-flight reads and releases them after completion', async () => {
  let finish!: (value: Response) => void;
  provider.mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve; }));
  const first = validatePartnerUpi('owner', { upiId: 'person@bank' });
  expect(validatePartnerUpi('owner', { upiId: 'PERSON@BANK' })).toBe(first);
  expect(provider).toHaveBeenCalledOnce();
  finish(response({ vpa: 'person@bank', success: true })); await first;
  provider.mockResolvedValueOnce(response({ vpa: 'person@bank', success: false }));
  expect((await validatePartnerUpi('owner', { upiId: 'person@bank' })).valid).toBe(false);
  expect(provider).toHaveBeenCalledTimes(2);
});
