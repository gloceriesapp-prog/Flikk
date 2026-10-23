import type { ApiAddress } from '../../api/addresses';
import type { Coordinates } from '../../location/geocoding';
import { distanceMeters } from '../../location/locationFilter';

// Small map/GPS rounding differences may describe the same saved pin. Never
// reuse an address merely because its city, district or text label matches.
const SAME_PIN_METERS = 20;
function validPin(pin: Coordinates) {
  return Number.isFinite(pin.latitude) && Number.isFinite(pin.longitude)
    && Math.abs(pin.latitude) <= 90 && Math.abs(pin.longitude) <= 180;
}
export function matchSavedAddress(addresses: ApiAddress[], pin: Coordinates): ApiAddress | null {
  if (!validPin(pin)) return null;
  const matches = addresses.flatMap(address => {
    if (address.latitude == null || address.longitude == null) return [];
    const point = { latitude: address.latitude, longitude: address.longitude };
    if (!validPin(point)) return [];
    const distance = distanceMeters(pin, point);
    return distance <= SAME_PIN_METERS ? [{ address, distance }] : [];
  });
  // Multiple recipients can share one apartment pin; preserve the account's
  // chosen default among matches. Change still opens the full address book.
  matches.sort((a, b) => Number(b.address.is_default) - Number(a.address.is_default) || a.distance - b.distance);
  return matches[0]?.address ?? null;
}
export function cartAddressForLocation(addresses: ApiAddress[], pin: Coordinates | null): ApiAddress | null {
  return pin ? matchSavedAddress(addresses, pin) : addresses.find(address => address.is_default) ?? addresses[0] ?? null;
}
