import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMsg91Client, SmsDeliveryError } from './msg91.js';
import type { SmsHookConfig } from './config.js';
const config: SmsHookConfig = { enabled: true, hookSecrets: [], authKey: 'test-key', templateId: '6ac7bde3ec8459c14b0cadb2', otpVariable: 'OTP', perMinuteLimit: 100, perDayLimit: 10000 };
const phone = '+919876543210'; const otp = '001234';
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.useRealTimers());
describe('MSG91 SMS transport', () => {
  it('transports original code using approved template with no URL rewriting', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ type: 'success', message: 'request-id' }));
    await createMsg91Client(config, fetcher)(phone, otp);
    const [url, request] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://control.msg91.com/api/v5/flow'); expect(request.redirect).toBe('error');
    expect(request.headers.authkey).toBe(config.authKey);
    expect(JSON.parse(request.body)).toEqual({ template_id: config.templateId, short_url: '0', recipients: [{ mobiles: '919876543210', OTP: '001234' }] });
  });
  it.each([[response({ type: 'error', message: 'private detail' }), 'failed'], [response({ type: 'success' }), 'unknown'], [response({ anything: true }), 'unknown'], [response({}, 401), 'failed'], [response({}, 500), 'unknown'], [new Response('not json'), 'unknown'], [new Response('x'.repeat(17000)), 'unknown']])('rejects non-confirmed result without details', async (reply, outcome) => {
    const fetcher = vi.fn().mockResolvedValue(reply);
    await expect(createMsg91Client(config, fetcher)(phone, otp)).rejects.toMatchObject({ outcome, message: 'SMS delivery was not confirmed.' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('aborts at 2500ms without retrying an ambiguous send', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url, request) => new Promise<Response>((_resolve, reject) => request?.signal?.addEventListener('abort', () => reject(new Error('sensitive error')))));
    const assertion = expect(createMsg91Client(config, fetcher)(phone, otp)).rejects.toMatchObject({ outcome: 'unknown' });
    await vi.advanceTimersByTimeAsync(2500); await assertion; expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('refuses invalid destination/code before provider access', async () => {
    const fetcher = vi.fn(); await expect(createMsg91Client(config, fetcher)('+12025550123', otp)).rejects.toBeInstanceOf(SmsDeliveryError);
    await expect(createMsg91Client(config, fetcher)(phone, '123')).rejects.toBeInstanceOf(SmsDeliveryError); expect(fetcher).not.toHaveBeenCalled();
  });
});
