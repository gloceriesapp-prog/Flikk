import { AppError } from '../lib/errors.js';

export function onboardingCoordinates(lat: unknown, lng: unknown, required: boolean): { lat?: number; lng?: number } {
  if (!required && lat === undefined && lng === undefined) return {};
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new AppError(400, 'INVALID_STORE_LOCATION', 'Select the store location on the map before submitting.');
  }
  return { lat, lng };
}
