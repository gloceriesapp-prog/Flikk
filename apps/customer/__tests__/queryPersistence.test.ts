import { QueryClient } from '@tanstack/react-query';
import { createQueryPersistence, type PersistStorage } from '../src/features/account-session/queryPersistence';
import { queryRetryDelay } from '../src/features/account-session/accountCache';

function memoryStorage(): PersistStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

async function saveFrom(storage: PersistStorage, fill: (client: QueryClient) => void, now = () => 1000) {
  const persistence = createQueryPersistence(storage, '1.0.4', now);
  const client = new QueryClient();
  await persistence.attach(client);
  fill(client);
  jest.advanceTimersByTime(1000);
  await persistence.attach(new QueryClient()); // flushes the queued save
  return persistence;
}

describe('query cache persistence', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('restores allowlisted catalogue queries only, never private ones', async () => {
    const storage = memoryStorage();
    await saveFrom(storage, (client) => {
      client.setQueryData(['home', 'sections'], ['deals']);
      client.setQueryData(['home', 'nearest-store', 1, 2], { id: 's1' });
      client.setQueryData(['addresses', 'customer-a'], ['home address']);
      client.setQueryData(['checkout-quote', 'customer-a'], { total: 100 });
    });
    const restored = new QueryClient();
    await createQueryPersistence(storage, '1.0.4', () => 2000).attach(restored);
    expect(restored.getQueryData(['home', 'sections'])).toEqual(['deals']);
    expect(restored.getQueryData(['home', 'nearest-store', 1, 2])).toEqual({ id: 's1' });
    expect(restored.getQueryData(['addresses', 'customer-a'])).toBeUndefined();
    expect(restored.getQueryData(['checkout-quote', 'customer-a'])).toBeUndefined();
  });

  it('ignores a snapshot from another app version or older than 24h', async () => {
    const storage = memoryStorage();
    await saveFrom(storage, (client) => client.setQueryData(['home-tabs'], ['all']));
    const otherVersion = new QueryClient();
    await createQueryPersistence(storage, '1.0.5', () => 2000).attach(otherVersion);
    expect(otherVersion.getQueryData(['home-tabs'])).toBeUndefined();
    const expired = new QueryClient();
    await createQueryPersistence(storage, '1.0.4', () => 1000 + 24 * 60 * 60 * 1000).attach(expired);
    expect(expired.getQueryData(['home-tabs'])).toBeUndefined();
  });

  it('discard wipes the snapshot before the next account restores', async () => {
    const storage = memoryStorage();
    const persistence = await saveFrom(storage, (client) => client.setQueryData(['home-tabs'], ['all']));
    expect(storage.data.size).toBe(1);
    void persistence.discard();
    const next = new QueryClient();
    await persistence.attach(next);
    expect(next.getQueryData(['home-tabs'])).toBeUndefined();
    expect(storage.data.size).toBe(0);
  });
});

describe('queryRetryDelay', () => {
  it('is full jitter over an exponential window capped at 30s', () => {
    expect(queryRetryDelay(0, () => 0)).toBe(0);
    expect(queryRetryDelay(0, () => 0.5)).toBe(500);
    expect(queryRetryDelay(1, () => 0.5)).toBe(1000);
    expect(queryRetryDelay(20, () => 0.999)).toBeLessThan(30000);
  });
});
