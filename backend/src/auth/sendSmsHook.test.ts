import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSendSms, hookSecrets, verifyHookSignature } from './sendSmsHook.js';
import { msg91Mobile, sendOtpSms } from '../lib/msg91.js';

const key = crypto.randomBytes(32);
const secretEnv = `v1,whsec_${key.toString('base64')}`;
const now = () => Math.floor(Date.now() / 1000);

function signed(body: string, signingKey = key, timestamp = now(), id = 'msg_1') {
  const sig = crypto.createHmac('sha256', signingKey).update(`${id}.${timestamp}.${body}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${sig}` };
}
const payload = (phone = '919876543210', otp = '123456') => JSON.stringify({ user: { id: 'user-1', phone }, sms: { otp } });

beforeEach(() => {
  vi.stubEnv('MSG91_AUTH_KEY', 'test-auth-key');
  vi.stubEnv('MSG91_OTP_TEMPLATE_ID', 'template-1');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('verifyHookSignature', () => {
  const secrets = hookSecrets(secretEnv);
  it('accepts a Standard Webhooks signature over the raw body', () => {
    const body = payload();
    expect(verifyHookSignature(body, signed(body), secrets)).toBe(true);
  });
  it('rejects a tampered body, wrong key, missing headers and stale timestamps', () => {
    const body = payload();
    expect(verifyHookSignature(payload('919999999999'), signed(body), secrets)).toBe(false);
    expect(verifyHookSignature(body, signed(body, crypto.randomBytes(32)), secrets)).toBe(false);
    expect(verifyHookSignature(body, {}, secrets)).toBe(false);
    expect(verifyHookSignature(body, signed(body, key, now() - 600), secrets)).toBe(false);
    expect(verifyHookSignature(body, signed(body), [])).toBe(false);
  });
  it('accepts any of several rotated secrets and any of several signatures', () => {
    const old = crypto.randomBytes(32);
    const rotated = hookSecrets(`v1,whsec_${crypto.randomBytes(32).toString('base64')}|v1,whsec_${old.toString('base64')}`);
    const body = payload();
    const headers = signed(body, old);
    headers['webhook-signature'] = `v1,${crypto.randomBytes(32).toString('base64')} ${headers['webhook-signature']}`;
    expect(verifyHookSignature(body, headers, rotated)).toBe(true);
  });
});

describe('msg91Mobile', () => {
  it('normalises Supabase phones to 91XXXXXXXXXX and refuses non-Indian numbers', () => {
    expect(msg91Mobile('919876543210')).toBe('919876543210');
    expect(msg91Mobile('+91 98765 43210')).toBe('919876543210');
    expect(msg91Mobile('9876543210')).toBe('919876543210');
    expect(() => msg91Mobile('14155552671')).toThrow();
    expect(() => msg91Mobile('911234567890')).toThrow();
    expect(() => msg91Mobile(undefined)).toThrow();
  });
});

describe('sendOtpSms', () => {
  it('sends the SMS-section DLT template through the Flow API, filling ##OTP##', async () => {
    const send = vi.fn(async (_url: URL, _init: RequestInit) => Response.json({ type: 'success', message: 'req-1' }));
    vi.stubGlobal('fetch', send);
    expect(await sendOtpSms('919876543210', '654321')).toBe('req-1');
    const [url, init] = send.mock.calls[0];
    expect(url.toString()).toBe('https://control.msg91.com/api/v5/flow');
    expect(JSON.parse(init.body as string)).toEqual({
      template_id: 'template-1', short_url: '0', recipients: [{ mobiles: '919876543210', OTP: '654321' }],
    });
    expect((init.headers as Record<string, string>).authkey).toBe('test-auth-key');
    expect(init.method).toBe('POST');
  });
  it('uses MSG91_OTP_VARIABLE as the template variable name, with or without ## marks', async () => {
    const send = vi.fn(async (_url: URL, _init: RequestInit) => Response.json({ type: 'success', message: 'req-3' }));
    vi.stubGlobal('fetch', send);
    vi.stubEnv('MSG91_OTP_VARIABLE', '##var1##');
    await sendOtpSms('919876543210', '111222');
    expect(JSON.parse(send.mock.calls[0][1].body as string).recipients[0]).toEqual({ mobiles: '919876543210', var1: '111222' });
  });
  it('can use the OTP API instead (MSG91_API=otp) for an OTP-section template', async () => {
    const send = vi.fn(async (_url: URL, _init: RequestInit) => Response.json({ type: 'success', request_id: 'req-4' }));
    vi.stubGlobal('fetch', send);
    vi.stubEnv('MSG91_API', 'otp');
    expect(await sendOtpSms('919876543210', '654321')).toBe('req-4');
    const [url] = send.mock.calls[0];
    expect(url.origin + url.pathname).toBe('https://control.msg91.com/api/v5/otp');
    expect(Object.fromEntries(url.searchParams)).toEqual({ template_id: 'template-1', mobile: '919876543210', otp: '654321' });
  });
  it('treats HTTP 200 with type "error" as a failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ type: 'error', message: 'Invalid template' })));
    await expect(sendOtpSms('919876543210', '123456')).rejects.toMatchObject({ status: 502 });
  });
  it('refuses to send without configuration', async () => {
    vi.stubEnv('MSG91_AUTH_KEY', '');
    const send = vi.fn(); vi.stubGlobal('fetch', send);
    await expect(sendOtpSms('919876543210', '123456')).rejects.toMatchObject({ status: 503 });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('handleSendSms', () => {
  const secrets = hookSecrets(secretEnv);
  it('delivers the OTP and answers 200 {} so Supabase treats it as sent', async () => {
    const send = vi.fn(async () => Response.json({ type: 'success', request_id: 'req-2' }));
    vi.stubGlobal('fetch', send);
    const body = payload();
    expect(await handleSendSms(body, signed(body), secrets)).toEqual({ status: 200, body: {} });
    expect(send).toHaveBeenCalledOnce();
  });
  it('never calls MSG91 for an unsigned or forged request', async () => {
    const send = vi.fn(); vi.stubGlobal('fetch', send);
    const body = payload();
    expect((await handleSendSms(body, {}, secrets)).status).toBe(401);
    expect((await handleSendSms(body, signed(body, crypto.randomBytes(32)), secrets)).status).toBe(401);
    expect((await handleSendSms(body, signed(body), [])).status).toBe(503);
    expect(send).not.toHaveBeenCalled();
  });
  it('returns the Supabase hook error shape when MSG91 fails, so the login request fails loudly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unauthorised', { status: 401 })));
    const body = payload();
    const result = await handleSendSms(body, signed(body), secrets);
    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ error: { http_code: 502 } });
  });
  it('rejects a payload without an OTP', async () => {
    const send = vi.fn(); vi.stubGlobal('fetch', send);
    const body = JSON.stringify({ user: { phone: '919876543210' }, sms: {} });
    expect((await handleSendSms(body, signed(body), secrets)).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
