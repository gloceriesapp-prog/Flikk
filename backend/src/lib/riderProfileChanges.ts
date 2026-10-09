import { AppError } from './errors.js';

const KEYS = new Set(['aadhaarPhotoPath', 'licencePhotoPath', 'licenceNumber', 'vehicleType', 'vehicleNumber']);
export function validateRiderProfileChanges(body: unknown, currentVehicleType: string | null): Record<string, string | null> {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !KEYS.has(key)))
    throw new AppError(400, 'INVALID_CHANGES', 'Choose only document or vehicle changes.');
  const input = body as Record<string, unknown>;
  const changes: Record<string, string | null> = {};
  for (const [key, column, max] of [['aadhaarPhotoPath', 'aadhaar_photo_url', 200], ['licencePhotoPath', 'dl_photo_url', 200], ['licenceNumber', 'dl_number', 30], ['vehicleNumber', 'vehicle_number', 20]] as const) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string' || (input[key] as string).trim().length > max)
      throw new AppError(400, 'INVALID_CHANGES', 'Check your document and vehicle details.');
    const value = (input[key] as string).trim();
    if (!value && key !== 'vehicleNumber') throw new AppError(400, 'INVALID_CHANGES', 'Document details cannot be empty.');
    changes[column] = value || null;
  }
  if (input.vehicleType !== undefined) {
    if (!['bicycle', 'scooter', 'motorcycle'].includes(String(input.vehicleType)))
      throw new AppError(400, 'INVALID_VEHICLE', 'Choose a valid vehicle type.');
    changes.vehicle_type = String(input.vehicleType);
  }
  if (input.vehicleType !== undefined || input.vehicleNumber !== undefined) {
    const type = changes.vehicle_type ?? currentVehicleType;
    if (type !== 'bicycle' && !changes.vehicle_number)
      throw new AppError(400, 'MISSING_REGISTRATION', 'Enter the registration number for your motor vehicle.');
    if (type === 'bicycle') changes.vehicle_number = null;
  }
  if (!Object.keys(changes).length) throw new AppError(400, 'NO_CHANGES', 'Choose a document or vehicle to update.');
  return changes;
}

export function isOwnedRiderDocument(path: string, userId: string, kind: 'aadhaar' | 'dl'): boolean {
  return path.startsWith(`${userId}/${kind}-`) && /^[a-f0-9-]+\/(aadhaar|dl)-[a-f0-9-]+\.jpg$/i.test(path);
}
