import { beforeEach, expect, it, vi } from 'vitest';

const secure = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('expo-secure-store', () => secure);
import { useAuthStore } from '../../../apps/partner/src/store/useAuthStore';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}

beforeEach(async () => {
  await useAuthStore.getState().clear();
  vi.clearAllMocks();
  useAuthStore.setState({ isHydrated: false });
});

it('keeps a verified session when the navigator remounts before SecureStore finishes saving', async () => {
  const writing = deferred<void>();
  secure.setItemAsync.mockReturnValueOnce(writing.promise);
  secure.getItemAsync.mockResolvedValue(null);
  const signingIn = useAuthStore.getState().setSession('verified-access', 'verified-refresh', true, true, false);
  await Promise.resolve();
  await useAuthStore.getState().hydrate();
  expect(secure.getItemAsync).not.toHaveBeenCalled();
  expect(useAuthStore.getState().accessToken).toBe('verified-access');
  expect(useAuthStore.getState().isApproved).toBe(true);
  writing.resolve();
  await signingIn;
});

it('does not resurrect a saved account during logout before deletion finishes', async () => {
  const deleting = deferred<void>();
  secure.deleteItemAsync.mockReturnValueOnce(deleting.promise);
  secure.getItemAsync.mockResolvedValue('old-account');
  const clearing = useAuthStore.getState().clear();
  await Promise.resolve();
  await useAuthStore.getState().hydrate();
  expect(secure.getItemAsync).not.toHaveBeenCalled();
  expect(useAuthStore.getState().accessToken).toBeNull();
  deleting.resolve();
  await clearing;
});

it('discards a cold-start read completed after a new OTP session', async () => {
  const reading = deferred<string | null>();
  secure.getItemAsync.mockReturnValue(reading.promise);
  const hydrating = useAuthStore.getState().hydrate();
  await useAuthStore.getState().setSession('new-access', 'new-refresh', true, true, false);
  reading.resolve('old-account');
  await hydrating;
  expect(useAuthStore.getState().accessToken).toBe('new-access');
  expect(useAuthStore.getState().refreshToken).toBe('new-refresh');
});

it('restores tokens once on cold start and skips subsequent navigator hydration', async () => {
  secure.getItemAsync.mockResolvedValueOnce('saved-access').mockResolvedValueOnce('saved-refresh');
  await useAuthStore.getState().hydrate();
  await useAuthStore.getState().hydrate();
  expect(secure.getItemAsync).toHaveBeenCalledTimes(2);
  expect(useAuthStore.getState().accessToken).toBe('saved-access');
  expect(useAuthStore.getState().refreshToken).toBe('saved-refresh');
});
