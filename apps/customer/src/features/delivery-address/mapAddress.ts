import type { ApiAddress } from '../../api/addresses';
import type { DeliveryLocation } from '../../store/useLocationStore';
import { reverseGeocode } from '../../location/geocoding';

type PinAddress = Pick<ApiAddress, 'latitude' | 'longitude' | 'map_address' | 'line1'>;
// Older edits sometimes copied the rider's building details into map_address.
export function savedMapAddress(address: Pick<PinAddress, 'map_address' | 'line1'>): string {
  const label = address.map_address?.trim() ?? '';
  return label && label !== address.line1.trim() ? label : '';
}
export function mapAddressLabel(address: PinAddress, selected?: DeliveryLocation | null): string {
  if (selected && selected.latitude === address.latitude && selected.longitude === address.longitude
    && selected.addressLabel.trim() && selected.addressLabel.trim() !== address.line1.trim()) return selected.addressLabel;
  return savedMapAddress(address) || 'Selected map location';
}
export async function locationFromAddress(address: PinAddress): Promise<DeliveryLocation | null> {
  const { latitude, longitude } = address;
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  let addressLabel = savedMapAddress(address); let city = '';
  if (!addressLabel) {
    try {
      const result = await reverseGeocode({ latitude, longitude });
      if (result.resolved !== false) { addressLabel = result.addressLabel.trim(); city = result.city; }
    } catch { /* Keep the real pin if geocoding is temporarily offline. */ }
  }
  return { latitude, longitude, addressLabel: addressLabel || 'Selected map location', city, source: 'manual' };
}
