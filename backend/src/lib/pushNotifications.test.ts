import { afterEach, describe, expect, it, vi } from 'vitest';
import { deadTokens, embeddedPushToken, sendPushNotification, sendPushNotifications } from './pushNotifications.js';

// Only the batch chunking has real logic worth guarding: Expo caps a
// /push/send request at 100 messages, so N messages must become ceil(N/100)
// POSTs, each carrying at most 100 — and a thrown fetch must never propagate.
describe('sendPushNotifications', () => {
  afterEach(() => vi.restoreAllMocks());

  function msgs(n: number) {
    return Array.from({ length: n }, (_, i) => ({ to: `t${i}`, title: 'x', body: 'y' }));
  }

  it('sends nothing for an empty list', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await sendPushNotifications([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chunks into requests of at most 100', async () => {
    const sizes: number[] = [];
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      sizes.push(JSON.parse(init.body).length);
      return {} as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendPushNotifications(msgs(250));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sizes).toEqual([100, 100, 50]);
  });

  it('never throws when a batch request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    await expect(sendPushNotifications(msgs(3))).resolves.toBeUndefined();
  });
});

describe('embeddedPushToken', () => {
  it('reads the object PostgREST returns for a many-to-one embed', () => {
    expect(embeddedPushToken({ expo_push_token: 'ExponentPushToken[a]' })).toBe('ExponentPushToken[a]');
  });
  it('still reads the array shape', () => {
    expect(embeddedPushToken([{ expo_push_token: 'ExponentPushToken[b]' }])).toBe('ExponentPushToken[b]');
  });
  it('returns null when no token exists', () => {
    expect(embeddedPushToken(null)).toBeNull();
    expect(embeddedPushToken({ expo_push_token: null })).toBeNull();
  });
});

describe('deadTokens', () => {
  it('picks only tokens whose ticket says DeviceNotRegistered, matched by position', () => {
    const batch = [{ to: 'a' }, { to: 'b' }, { to: 'c' }];
    const tickets = [
      { status: 'ok' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'error', details: { error: 'MessageRateExceeded' } },
    ];
    expect(deadTokens(batch, tickets)).toEqual(['b']);
  });
  it('returns nothing when Expo sent no tickets', () => {
    expect(deadTokens([{ to: 'a' }], [])).toEqual([]);
  });
});

describe('sendPushNotification', () => {
  afterEach(() => vi.restoreAllMocks());
  it('forwards channel, priority and data to Expo', async () => {
    let sent: unknown;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return {} as Response;
    }));
    await sendPushNotification('ExponentPushToken[x]', 'New order', 'body', { channelId: 'orders', priority: 'high', data: { orderId: 'o1' } });
    expect(sent).toEqual([{ sound: 'default', to: 'ExponentPushToken[x]', title: 'New order', body: 'body', channelId: 'orders', priority: 'high', data: { orderId: 'o1' } }]);
  });
});
