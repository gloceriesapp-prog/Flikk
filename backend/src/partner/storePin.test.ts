import { expect, it, vi } from 'vitest';
import { confirmStorePin, storePinPresentation } from '../../../apps/partner/src/location/storePin';
const pin = { latitude: 13.21, longitude: 74.74 };
function deferred() { let resolve!: () => void; const promise = new Promise<void>(yes => { resolve = yes; }); return { promise, resolve }; }
it('keeps the map open until the selected pin has actually saved', async () => {
  const pending = deferred(); const save = vi.fn(() => pending.promise); const close = vi.fn();
  const work = confirmStorePin({ coordinates: pin, addressLabel: 'Store entrance', resolveDistrict: async () => ' Udupi ', save, close });
  await vi.waitFor(() => expect(save).toHaveBeenCalledWith(pin, 'Udupi', 'Store entrance')); expect(close).not.toHaveBeenCalled();
  pending.resolve(); await work; expect(close).toHaveBeenCalledOnce();
});
it('leaves the map available for retry if saving fails', async () => {
  const close = vi.fn();
  await expect(confirmStorePin({ coordinates: pin, addressLabel: null, resolveDistrict: async () => 'Udupi', save: async () => { throw new Error('offline'); }, close })).rejects.toThrow('offline');
  expect(close).not.toHaveBeenCalled();
});
it('does not invent a district or save malformed coordinates', async () => {
  const save = vi.fn(); const close = vi.fn();
  await expect(confirmStorePin({ coordinates: pin, addressLabel: null, resolveDistrict: async () => null, save, close })).rejects.toThrow('identify this area');
  await expect(confirmStorePin({ coordinates: { latitude: NaN, longitude: 74 }, addressLabel: null, resolveDistrict: async () => 'Udupi', save, close })).rejects.toThrow('valid store pin');
  expect(save).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});
it('captures the chosen point before awaiting the address lookup', async () => {
  const coordinates = { ...pin }; const save = vi.fn(); const close = vi.fn();
  const work = confirmStorePin({ coordinates, addressLabel: null, resolveDistrict: async () => { coordinates.latitude = 0; return 'Udupi'; }, save, close });
  await work; expect(save.mock.calls[0][0]).toEqual(pin);
});
it('shows the pending pin for editing without changing the approved pickup location', () => {
  const profile = { lat: 13.21, lng: 74.74, district: 'Udupi', addressLine: 'Approved entrance', pendingChange: { status: 'pending', changes: { lat: 13.22, lng: 74.75, address_line: 'New entrance' } } };
  expect(storePinPresentation(profile)).toMatchObject({ pending: true, coordinates: { latitude: 13.22, longitude: 74.75 }, address: 'New entrance' });
  expect(profile.addressLine).toBe('Approved entrance'); expect(profile.lat).toBe(13.21);
  expect(storePinPresentation({ ...profile, pendingChange: { ...profile.pendingChange, status: 'rejected' } })).toMatchObject({ pending: false, coordinates: pin, address: 'Approved entrance' });
});
it('does not seed a default map point from an incomplete stored pin', () => {
  expect(storePinPresentation({ lat: null, lng: null, district: '', addressLine: null }).coordinates).toBeNull();
});

it('discards a pin lookup that completes after an account change', async () => {
  let current = true; const save = vi.fn(); const close = vi.fn();
  await expect(confirmStorePin({ coordinates: pin, addressLabel: null,
    resolveDistrict: async () => { current = false; return 'Udupi'; },
    save, close, isCurrent: () => current })).rejects.toThrow('account changed');
  expect(save).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});

it('leaves a stalled area lookup retryable instead of saving a fabricated district', async () => {
  vi.useFakeTimers();
  try {
    const save = vi.fn(); const close = vi.fn();
    const work = confirmStorePin({ coordinates: pin, addressLabel: null, resolveDistrict: () => new Promise(() => {}), save, close });
    const assertion = expect(work).rejects.toThrow('identify this area');
    await vi.advanceTimersByTimeAsync(8_000); await assertion;
    expect(save).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});
