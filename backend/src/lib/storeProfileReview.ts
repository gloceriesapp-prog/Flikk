// Store profile edits that need admin review (migration 114). The store's
// identity and delivery reach — name, category, address, map pin, drug
// licence — are filed as a store_profile_change_requests row by PATCH
// /partner/store; the live store keeps its current values until admin
// approves on the Stores page. Everything else a partner edits (hours,
// prep time, photo, documents, open/closed) stays live.
import { AppError } from './errors.js';
import { normalizeDrugLicense } from './storeCategories.js';

export const REVIEWED_STORE_FIELDS = ['name', 'category', 'district', 'address_line', 'manual_address', 'lat', 'lng', 'drug_license_number'] as const;
export type ReviewedStoreField = (typeof REVIEWED_STORE_FIELDS)[number];
export type ReviewedChanges = Partial<Record<ReviewedStoreField, string | number | null>>;
export const PROFILE_CHANGE_SELECT = 'id, status, changes, review_reason, created_at, reviewed_at';

const bad = (message: string) => new AppError(400, 'INVALID_STORE_FIELD', message);

function text(value: unknown, label: string, max: number, required: boolean): string | null {
  if (value === null && !required) return null;
  if (typeof value !== 'string') throw bad(`${label} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw bad(`${label} cannot be empty.`);
  if (trimmed.length > max) throw bad(`${label} is too long.`);
  return trimmed;
}

function coordinate(value: unknown, label: string, limit: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) throw bad(`${label} must be a valid coordinate.`);
  return value;
}

// The reviewed fields present in a PATCH body, validated and normalized.
// Category membership is checked by the route (it needs the licence).
export function reviewedChanges(body: Record<string, unknown>): ReviewedChanges {
  const changes: ReviewedChanges = {};
  if (body.name !== undefined) changes.name = text(body.name, 'Store name', 120, true);
  if (body.category !== undefined) changes.category = text(body.category, 'Category', 100, true);
  if (body.district !== undefined) changes.district = text(body.district, 'District', 100, true);
  if (body.address_line !== undefined) changes.address_line = text(body.address_line, 'Address', 500, false) || null;
  if (body.manual_address !== undefined) changes.manual_address = text(body.manual_address, 'Address description', 500, false) || null;
  if ((body.lat === undefined) !== (body.lng === undefined)) throw bad('Send the map pin as both lat and lng.');
  if (body.lat !== undefined) {
    changes.lat = coordinate(body.lat, 'Latitude', 90);
    changes.lng = coordinate(body.lng, 'Longitude', 180);
  }
  if (body.drug_license_number !== undefined) changes.drug_license_number = normalizeDrugLicense(body.drug_license_number);
  return changes;
}
