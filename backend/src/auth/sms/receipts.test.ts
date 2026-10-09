import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rpc: vi.fn(), abort: vi.fn(), enabled: true }));
vi.mock('../../db/supabase.js', () => ({ supabase: { rpc: state.rpc } }));
vi.mock('../../config/env.js', () => ({ env: { supabaseServiceRoleKey: 'fallback-private-key', sms: {
  get enabled() { return state.enabled; }, perMinuteLimit: 100, perDayLimit: 10000,
} } }));
import { pruneSmsReceipts, smsReceipts } from './receipts.js';
const event = 'signed_sms_event'; const phone = '+919876543210'; const hash = 'a'.repeat(64);
beforeEach(() => {
  vi.clearAllMocks(); state.enabled = true; vi.stubEnv('AUTH_BUDGET_SECRET', 'stable-private-hmac-key');
  state.abort.mockResolvedValue({ data: 'claimed', error: null }); state.rpc.mockReturnValue({ abortSignal: state.abort });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('durable SMS receipts adapter', () => {
  it('passes only purpose-separated HMAC identifiers and bounded quotas to SQL', async () => {
    expect(await smsReceipts.claim(event, hash, phone)).toBe('claimed');
    const key = (kind: string, value: string) => createHmac('sha256', 'stable-private-hmac-key').update(`sms:${kind}:${value}`).digest('hex');
    expect(state.rpc).toHaveBeenCalledWith('claim_send_sms_delivery', { p_event_key: key('event', event), p_payload_hash: key('payload', hash), p_phone_key: key('phone', phone), p_global_limit: 100, p_daily_limit: 10000 });
    const args = JSON.stringify(state.rpc.mock.calls[0]); expect(args).not.toContain(phone); expect(args).not.toContain(event); expect(args).not.toContain('stable-private-hmac-key');
    expect(state.abort).toHaveBeenCalledWith(expect.any(AbortSignal));
  });
  it.each(['claimed', 'sent', 'blocked'])('accepts the explicit SQL outcome %s', async data => {
    state.abort.mockResolvedValue({ data, error: null }); expect(await smsReceipts.claim(event, hash, phone)).toBe(data);
  });
  it.each([null, undefined, {}, [], 'success', true])('fails closed for unexpected database results %j', async data => {
    state.abort.mockResolvedValue({ data, error: null }); await expect(smsReceipts.claim(event, hash, phone)).rejects.toThrow('SMS receipt unavailable.');
  });
  it('does not expose RPC errors', async () => {
    state.abort.mockResolvedValue({ data: 'claimed', error: { message: `private SQL ${phone}` } }); await expect(smsReceipts.claim(event, hash, phone)).rejects.toThrow('SMS receipt unavailable.');
  });
  it('uses a 650ms database timeout to leave room for transport within the hook budget', async () => {
    let signal: AbortSignal | undefined;
    state.abort.mockImplementation((next: AbortSignal) => { signal = next; return new Promise((_resolve, reject) => next.addEventListener('abort', () => reject(next.reason))); });
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const claim = smsReceipts.claim(event, hash, phone);
    await expect(claim).rejects.toThrow(); expect(signal?.aborted).toBe(true); expect(timeout).toHaveBeenCalledWith(650);
  });
  it.each(['sent', 'failed', 'unknown'] as const)('finishes %s against the same stable event hash', async status => {
    state.abort.mockResolvedValue({ error: null }); await smsReceipts.finish(event, status);
    expect(state.rpc).toHaveBeenCalledWith('finish_send_sms_delivery', { p_event_key: expect.stringMatching(/^[a-f0-9]{64}$/), p_status: status });
  });
  it('fails closed on failed final receipt persistence', async () => {
    state.abort.mockResolvedValue({ error: { message: 'private error' } }); await expect(smsReceipts.finish(event, 'sent')).rejects.toThrow('SMS receipt unavailable.');
  });
  it('cleans up receipts only while MSG91 is enabled', async () => {
    state.enabled = false; await pruneSmsReceipts(); expect(state.rpc).not.toHaveBeenCalled();
    state.enabled = true; state.rpc.mockResolvedValue({ error: null }); await pruneSmsReceipts(); expect(state.rpc).toHaveBeenCalledWith('prune_send_sms_deliveries');
  });
});
