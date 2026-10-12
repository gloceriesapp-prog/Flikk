import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendOtpSms } from './msg91.js';

beforeEach(() => {
  vi.stubEnv('MSG91_AUTH_KEY', 'test-auth-key');
  vi.stubEnv('MSG91_OTP_TEMPLATE_ID', 'template-1');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('sendOtpSms retry on transient failure', () => {
  it('retries once on a 5xx and resolves on the second attempt', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(new Response('upstream error', { status: 500 }))
      .mockResolvedValueOnce(Response.json({ type: 'success', message: 'req-ok' }));
    vi.stubGlobal('fetch', send);
    expect(await sendOtpSms('919876543210', '654321')).toBe('req-ok');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 400 and throws immediately', async () => {
    const send = vi.fn(async () => Response.json({ type: 'error', message: 'bad request' }, { status: 400 }));
    vi.stubGlobal('fetch', send);
    await expect(sendOtpSms('919876543210', '654321')).rejects.toMatchObject({ status: 502 });
    expect(send).toHaveBeenCalledOnce();
  });
});
