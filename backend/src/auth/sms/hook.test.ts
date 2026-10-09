import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { Webhook } from 'standardwebhooks';
import { createSendSmsHookHandler } from './hook.js';
import { SmsDeliveryError } from './msg91.js';
import type { SmsHookConfig } from './config.js';
const secret = `whsec_${Buffer.alloc(32, 1).toString('base64')}`;
const config: SmsHookConfig = { enabled: true, hookSecrets: [`v1,${secret}`], authKey: 'key', templateId: 'template', otpVariable: 'OTP', perMinuteLimit: 100, perDayLimit: 10000 };
const normal = { user: { phone: '919876543210' }, sms: { otp: '001234' } };
function setup({ payload = normal as unknown, date = new Date(), badSignature = false, enabled = true } = {}) {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const headers: Record<string, string> = { 'webhook-id': 'sms_event_123', 'webhook-timestamp': String(Math.floor(date.getTime() / 1000)), 'webhook-signature': badSignature ? 'v1,invalid' : new Webhook(secret).sign('sms_event_123', date, raw) };
  const req = { body: Buffer.from(raw), get: (key: string) => headers[key] } as Request;
  const status = vi.fn().mockReturnThis(); const json = vi.fn().mockReturnThis(); const res = { status, json } as unknown as Response;
  const receipts = { claim: vi.fn().mockResolvedValue('claimed'), finish: vi.fn().mockResolvedValue(undefined) }; const send = vi.fn().mockResolvedValue(undefined);
  const handler = createSendSmsHookHandler({ config: { ...config, enabled }, receipts, send });
  return { req, status, json, receipts, send, run: () => handler(req, res, vi.fn()) };
}
describe('Supabase signed Send SMS hook', () => {
  it('normalizes phone and persists confirmed delivery before success', async () => {
    const t = setup(); await t.run(); expect(t.send).toHaveBeenCalledWith('+919876543210', '001234');
    expect(t.receipts.claim).toHaveBeenCalledWith('sms_event_123', expect.stringMatching(/^[a-f0-9]{64}$/), '+919876543210');
    expect(t.receipts.finish).toHaveBeenCalledWith('sms_event_123', 'sent'); expect(t.status).toHaveBeenCalledWith(200);
  });
  it.each([{ badSignature: true }, { date: new Date(Date.now() - 301000) }, { date: new Date(Date.now() + 301000) }])('rejects forged/stale signatures before database %j', async options => {
    const t = setup(options); await t.run(); expect(t.status).toHaveBeenCalledWith(401); expect(t.receipts.claim).not.toHaveBeenCalled(); expect(t.send).not.toHaveBeenCalled();
  });
  it.each(['not json', {}, { user: { phone: '+12025550123' }, sms: { otp: '123456' } }, { user: { phone: '+919876543210' }, sms: { otp: 123456 } }, { user: { phone: '+919876543210' }, sms: { otp: '12345' } }])('rejects malformed signed payload %j', async payload => {
    const t = setup({ payload }); await t.run(); expect(t.status).toHaveBeenCalledWith(400); expect(t.receipts.claim).not.toHaveBeenCalled();
  });
  it('rejects payload tampering even with otherwise valid signed headers', async () => {
    const t = setup(); t.req.body = Buffer.from(JSON.stringify({ ...normal, sms: { otp: '999999' } })); await t.run();
    expect(t.status).toHaveBeenCalledWith(401); expect(t.receipts.claim).not.toHaveBeenCalled();
  });
  it('accepts the previous secret during bounded rotation', async () => {
    const t = setup();
    const handler = createSendSmsHookHandler({ config: { ...config, hookSecrets: [`v1,whsec_${Buffer.alloc(32, 2).toString('base64')}`, ...config.hookSecrets] }, receipts: t.receipts, send: t.send });
    await handler(t.req, { status: t.status, json: t.json } as unknown as Response, vi.fn());
    expect(t.status).toHaveBeenCalledWith(200); expect(t.send).toHaveBeenCalledTimes(1);
  });
  it('requires raw original bytes', async () => { const t = setup(); t.req.body = normal; await t.run(); expect(t.status).toHaveBeenCalledWith(400); expect(t.send).not.toHaveBeenCalled(); });
  it('acknowledges confirmed replay without sending again', async () => { const t = setup(); t.receipts.claim.mockResolvedValue('sent'); await t.run(); expect(t.status).toHaveBeenCalledWith(200); expect(t.send).not.toHaveBeenCalled(); });
  it('blocks simultaneous or unconfirmed replay', async () => { const t = setup(); t.receipts.claim.mockResolvedValue('blocked'); await t.run(); expect(t.status).toHaveBeenCalledWith(429); expect(t.send).not.toHaveBeenCalled(); });
  it('persists uncertain outcomes with no success', async () => { const t = setup(); t.send.mockRejectedValue(new SmsDeliveryError('unknown')); await t.run(); expect(t.receipts.finish).toHaveBeenCalledWith('sms_event_123', 'unknown'); expect(t.status).toHaveBeenCalledWith(503); });
  it('fails closed when receipt store fails without exposing error', async () => { const t = setup(); t.receipts.claim.mockRejectedValue(new Error('database secret')); await t.run(); expect(t.status).toHaveBeenCalledWith(503); expect(t.send).not.toHaveBeenCalled(); expect(JSON.stringify(t.json.mock.calls)).not.toContain('database secret'); });
  it('does not acknowledge an unpersisted accepted send', async () => { const t = setup(); t.receipts.finish.mockRejectedValue(new Error('database failure')); await t.run(); expect(t.status).toHaveBeenCalledWith(503); expect(t.send).toHaveBeenCalledTimes(1); });
  it('never sends when disabled', async () => { const t = setup({ enabled: false }); await t.run(); expect(t.status).toHaveBeenCalledWith(503); expect(t.send).not.toHaveBeenCalled(); });
});
