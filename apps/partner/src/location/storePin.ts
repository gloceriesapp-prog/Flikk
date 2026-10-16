import type { Coordinates } from './geocoding';

export function validStorePin(pin: Coordinates | null): pin is Coordinates {
  return !!pin && Number.isFinite(pin.latitude) && Number.isFinite(pin.longitude)
    && Math.abs(pin.latitude) <= 90 && Math.abs(pin.longitude) <= 180;
}

export async function confirmStorePin(options: {
  coordinates: Coordinates;
  addressLabel: string | null;
  resolveDistrict: (pin: Coordinates) => Promise<string | null>;
  save: (pin: Coordinates, district: string, address: string | null) => void | Promise<void>;
  close: () => void;
  isCurrent?: () => boolean;
}): Promise<void> {
  const assertCurrent = () => { if (options.isCurrent && !options.isCurrent()) throw new Error('Your account changed. Reopen the map.'); };
  assertCurrent();
  const pin = { ...options.coordinates };
  if (!validStorePin(pin)) throw new Error('Choose a valid store pin.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let district: string | undefined;
  try {
    // Native geocoders do not always reject when unavailable. Keep confirmation
    // retryable instead of leaving the action busy indefinitely.
    district = (await Promise.race([
      options.resolveDistrict(pin),
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 8_000); }),
    ]))?.trim();
  } finally { clearTimeout(timer); }
  assertCurrent();
  if (!district) throw new Error('Could not identify this area. Please move the pin slightly or search for your store.');
  await options.save(pin, district, options.addressLabel);
  assertCurrent();
  options.close();
}

// A proposed location is visible to its owner but never replaces the approved
// pickup point used by customers and riders until the admin review commits.
export function storePinPresentation(profile: {
  lat: number | null; lng: number | null; district: string; addressLine: string | null;
  pendingChange?: { status: string; changes: Record<string, unknown> } | null;
}) {
  const changes = profile.pendingChange?.status === 'pending' ? profile.pendingChange.changes : {};
  const pending = ['lat', 'lng', 'district', 'address_line'].some(key => key in changes);
  const latitude = typeof changes.lat === 'number' ? changes.lat : profile.lat;
  const longitude = typeof changes.lng === 'number' ? changes.lng : profile.lng;
  const pin = typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : null;
  const address = typeof changes.address_line === 'string' ? changes.address_line : profile.addressLine;
  const district = typeof changes.district === 'string' ? changes.district : profile.district;
  return { pending, coordinates: validStorePin(pin) ? pin : null, address, district };
}
