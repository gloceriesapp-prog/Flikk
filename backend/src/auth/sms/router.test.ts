import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type ErrorRequestHandler } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Webhook } from 'standardwebhooks';

const state = vi.hoisted(() => ({
  secret: `v1,whsec_${Buffer.alloc(32, 1).toString('base64')}`,
  send: vi.fn(), claim: vi.fn(), finish: vi.fn(),
}));
vi.mock('../../config/env.js', () => ({ env: { sms: {
  enabled: true, hookSecrets: [state.secret], authKey: 'mock-key', templateId: 'mock-template', otpVariable: 'OTP', perMinuteLimit: 100, perDayLimit: 10000,
} } }));
vi.mock('./msg91.js', async load => ({
  ...await load<typeof import('./msg91.js')>(), createMsg91Client: () => state.send,
}));
vi.mock('./receipts.js', () => ({ smsReceipts: { claim: state.claim, finish: state.finish } }));
import { sendSmsRouter } from './router.js';

let server: Server | undefined;
beforeEach(() => {
  vi.clearAllMocks(); state.send.mockResolvedValue(undefined); state.claim.mockResolvedValue('claimed'); state.finish.mockResolvedValue(undefined);
});
afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    server = undefined;
  }
});
async function start() {
  const app = express();
  app.use('/auth/hooks', sendSmsRouter);
  app.use(express.json());
  app.post('/ordinary', (req, res) => res.json({ parsed: !Buffer.isBuffer(req.body) }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => res.status(error.status || 500).json({ error: 'Invalid request.' });
  app.use(errors);
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
function signed(body: string) {
  const date = new Date();
  return { 'content-type': 'application/json', 'webhook-id': 'http_sms_event_123', 'webhook-timestamp': String(Math.floor(date.getTime() / 1000)), 'webhook-signature': new Webhook(state.secret.replace(/^v1,/, '')).sign('http_sms_event_123', date, body) };
}
const body = '{ "user": {"phone":"919876543210"}, "sms": {"otp":"001234"} }';
describe('SMS raw-body HTTP route', () => {
  it('verifies the original whitespace-preserving bytes before ordinary JSON middleware', async () => {
    const base = await start();
    const response = await fetch(`${base}/auth/hooks/send-sms`, { method: 'POST', headers: signed(body), body });
    expect(response.status).toBe(200); expect(await response.json()).toEqual({}); expect(response.headers.get('cache-control')).toBe('no-store');
    expect(state.send).toHaveBeenCalledWith('+919876543210', '001234');
    const ordinary = await fetch(`${base}/ordinary`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(await ordinary.json()).toEqual({ parsed: true });
  });
  it('rejects missing or invalid signatures without receipt/provider access', async () => {
    const base = await start();
    for (const headers of [{ 'content-type': 'application/json' }, { ...signed(body), 'webhook-signature': 'v1,forged' }]) {
      expect((await fetch(`${base}/auth/hooks/send-sms`, { method: 'POST', headers, body })).status).toBe(401);
    }
    expect(state.claim).not.toHaveBeenCalled(); expect(state.send).not.toHaveBeenCalled();
  });
  it('rejects a tampered body even when JSON fields are semantically identical', async () => {
    const base = await start();
    expect((await fetch(`${base}/auth/hooks/send-sms`, { method: 'POST', headers: signed(body), body: JSON.stringify(JSON.parse(body)) })).status).toBe(401);
    expect(state.claim).not.toHaveBeenCalled(); expect(state.send).not.toHaveBeenCalled();
  });
  it('rejects oversized signed bodies at the parser before any SMS work', async () => {
    const base = await start(); const large = JSON.stringify({ user: { phone: '919876543210' }, sms: { otp: '001234' }, padding: 'x'.repeat(17000) });
    expect((await fetch(`${base}/auth/hooks/send-sms`, { method: 'POST', headers: signed(large), body: large })).status).toBe(413);
    expect(state.claim).not.toHaveBeenCalled(); expect(state.send).not.toHaveBeenCalled();
  });
  it('rejects incompatible content types and compressed bodies before SMS work', async () => {
    const base = await start();
    expect((await fetch(`${base}/auth/hooks/send-sms`, { method: 'POST', headers: { ...signed(body), 'content-type': 'text/plain' }, body })).status).toBe(400);
    expect((await fetch(`${base}/auth/hooks/send-sms`, { method: 'POST', headers: { ...signed(body), 'content-encoding': 'gzip' }, body })).status).toBe(415);
    expect(state.claim).not.toHaveBeenCalled(); expect(state.send).not.toHaveBeenCalled();
  });
});
