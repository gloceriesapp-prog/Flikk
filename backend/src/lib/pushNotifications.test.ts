import { afterEach, describe, expect, it, vi } from 'vitest';
import { embeddedPushToken, sendPushNotifications } from './pushNotifications.js';

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
