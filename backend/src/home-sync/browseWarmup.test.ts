import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../apps/customer/src/api/client', () => ({ apiRequest: vi.fn() }));
import { QueryClient } from '../../../apps/customer/node_modules/@tanstack/react-query';
import { apiRequest } from '../../../apps/customer/src/api/client';
import { inventoryPreviewQuery, warmInventoryPreviews } from '../../../apps/customer/src/screens/home/loading/inventoryQuery';

beforeEach(() => { vi.mocked(apiRequest).mockReset(); });
describe('Home preview warming', () => {
  it('deduplicates warming with an immediate category visit and reuses the result', async () => {
    const client = new QueryClient();
    let finish!: (value: never[]) => void;
    vi.mocked(apiRequest).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const options = inventoryPreviewQuery('shop', 'grocery');
    const background = client.prefetchQuery(options);
    const foreground = client.fetchQuery(options);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    finish([]);
    await Promise.all([background, foreground]);
    await client.fetchQuery(options);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    client.clear();
  });
  it('skips cached reads and stops scheduling after scope changes', async () => {
    const client = new QueryClient();
    let stop = false;
    vi.mocked(apiRequest).mockImplementation(async () => { stop = true; return []; });
    await warmInventoryPreviews(client, ['a', 'b'], ['grocery', 'fresh'], () => stop);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/stores/a/products?limit=48', expect.objectContaining({ auth: false }));
    stop = false;
    vi.mocked(apiRequest).mockImplementation(async () => []);
    await warmInventoryPreviews(client, ['a'], ['grocery'], () => stop);
    expect(apiRequest).toHaveBeenCalledTimes(2);
    await warmInventoryPreviews(client, ['a'], ['grocery'], () => false);
    expect(apiRequest).toHaveBeenCalledTimes(2);
    client.clear();
  });
  it('does not retry background failures or mix store/category scopes', async () => {
    const client = new QueryClient();
    vi.mocked(apiRequest).mockRejectedValue(new Error('offline'));
    await warmInventoryPreviews(client, ['a'], ['grocery'], () => false);
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(inventoryPreviewQuery('a', 'grocery').queryKey)).toBeUndefined();
    expect(inventoryPreviewQuery('a', 'grocery').queryKey).not.toEqual(inventoryPreviewQuery('a', 'fresh').queryKey);
    expect(inventoryPreviewQuery('a', 'grocery').queryKey).not.toEqual(inventoryPreviewQuery('b', 'grocery').queryKey);
    client.clear();
  });
});
