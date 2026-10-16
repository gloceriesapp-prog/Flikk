import { beforeEach, describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('../db/supabase.js', () => ({ supabase: { rpc } }));
import { runMerchantOrderNotifications, runMerchantOrderReceipts } from './merchantOrders.js';
const job = { id: 'event-1', order_id: 'order-1', user_id: 'owner-1', lease_token: 'lease-1', attempts: 1, ticket_id: null, token: 'ExpoPushToken[owner]', amount: 14.5 };
function result(data: unknown) { return { data, error: null }; }
beforeEach(() => { vi.restoreAllMocks(); rpc.mockReset(); });
function outcome() { return rpc.mock.calls.find(call => call[0] === 'finish_merchant_order_push')?.[1]; }
describe('merchant alert outbox', () => {
  it('persists accepted Expo tickets and stable navigation IDs', async () => {
    rpc.mockResolvedValueOnce(result([job])).mockResolvedValue(result(true));
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [{ status: 'ok', id: 'ticket-1' }] })));
    await runMerchantOrderNotifications();
    expect(outcome()).toMatchObject({ p_outcome: 'ticket', p_ticket: 'ticket-1', p_lease: 'lease-1' });
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)[0]).toMatchObject({ channelId: 'orders', priority: 'high', data: { orderId: 'order-1', notificationId: 'event-1' } });
  });
  it('retains failures for bounded database retries', async () => {
    rpc.mockResolvedValueOnce(result([job])).mockResolvedValue(result(true));
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await runMerchantOrderNotifications();
    expect(outcome()).toMatchObject({ p_outcome: 'retry', p_lease: 'lease-1' });
  });
  it('clears only the unregistered token using a fenced outcome', async () => {
    rpc.mockResolvedValueOnce(result([job])).mockResolvedValue(result(true));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] })));
    await runMerchantOrderNotifications();
    expect(outcome()).toMatchObject({ p_outcome: 'dead', p_token: job.token });
  });
  it('retries registration without issuing a provider request until the order expires', async () => {
    rpc.mockResolvedValueOnce(result([{ ...job, token: null }])).mockResolvedValue(result(true));
    const fetch = vi.spyOn(globalThis, 'fetch');
    await runMerchantOrderNotifications();
    expect(fetch).not.toHaveBeenCalled();
    expect(outcome()).toMatchObject({ p_outcome: 'retry' });
  });
  it('never turns a receipt outage into a duplicate send', async () => {
    rpc.mockResolvedValueOnce(result([{ ...job, ticket_id: 'ticket-1' }])).mockResolvedValue(result(true));
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await runMerchantOrderReceipts();
    expect(fetch.mock.calls[0]![0]).toContain('getReceipts');
    expect(outcome()).toMatchObject({ p_outcome: 'receipt_pending' });
  });
  it('marks final provider receipts confirmed', async () => {
    rpc.mockResolvedValueOnce(result([{ ...job, ticket_id: 'ticket-1' }])).mockResolvedValue(result(true));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { 'ticket-1': { status: 'ok' } } })));
    await runMerchantOrderReceipts();
    expect(outcome()).toMatchObject({ p_outcome: 'confirmed' });
  });
  it('leaves failed ticket persistence leased instead of recording a normal provider failure', async () => {
    rpc.mockResolvedValueOnce(result([job])).mockResolvedValue({ error: new Error('db offline') });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [{ status: 'ok', id: 'ticket-1' }] })));
    await expect(runMerchantOrderNotifications()).rejects.toThrow('db offline');
    expect(rpc.mock.calls.filter(call => call[0] === 'finish_merchant_order_push')).toHaveLength(1);
  });
});
