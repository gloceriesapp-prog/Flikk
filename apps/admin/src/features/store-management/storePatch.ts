import { STORE_CATEGORIES } from '../../lib/store-options';

const textColumns = {
  name: 'name', category: 'category', ownerName: 'owner_name', phone: 'phone',
  addressLine: 'address_line', manualAddress: 'manual_address', city: 'city', district: 'district',
  state: 'state', country: 'country', openTime: 'open_time', closeTime: 'close_time', photoUrl: 'photo_url',
  fssaiNumber: 'fssai_number', shopEstablishmentNumber: 'shop_establishment_number', panNumber: 'pan_number',
  gstNumber: 'gst_number', drugLicenseNumber: 'drug_license_number', udyamNumber: 'udyam_number',
} as const;
const numericColumns = { lat: 'lat', lng: 'lng', deliveryRadiusKm: 'delivery_radius_km', avgPrepMinutes: 'avg_prep_minutes' } as const;
// Legacy aadhaar_last4 / bank_name / bank_account_last4 /
// turnover_exceeds_gst_threshold are not editable: nothing reads them (payouts
// use the payout_* columns, set via the store page's payout account panel).
const booleanColumns = { isActive: 'is_active' } as const;
export type StorePatchInput = Partial<Record<keyof typeof textColumns, string | null> & Record<keyof typeof numericColumns, number | null> & Record<keyof typeof booleanColumns, boolean>>;
export class StorePatchError extends Error {}
const fail = (message: string): never => { throw new StorePatchError(message); };

// Explicit allow-list: record IDs, ownership, ratings and payment-provider
// verification cannot be changed through a generic profile edit request.
export function parseStorePatch(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Invalid store changes.');
  const patch: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (Object.hasOwn(textColumns, key)) {
      if (raw !== null && typeof raw !== 'string') fail(`${key} must be text.`);
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (text.length > (key === 'photoUrl' ? 2048 : 500)) fail(`${key} is too long.`);
      if (['name', 'category', 'city', 'district', 'state', 'country'].includes(key) && !text) fail(`${key} cannot be empty.`);
      if (key === 'category' && !STORE_CATEGORIES.some(category => category === text)) fail('Choose a valid store category.');
      if (['openTime', 'closeTime'].includes(key) && text && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(text)) fail('Hours must use a valid 24-hour time.');
      if (key === 'phone' && text && !/^\+?[\d\s()-]{7,25}$/.test(text)) fail('Enter a valid contact phone number.');
      if (key === 'photoUrl' && text) {
        let url: URL;
        try { url = new URL(text); } catch { fail('Enter a valid photo URL.'); }
        if (!['https:', 'http:'].includes(url!.protocol) || url!.username || url!.password) fail('Photo URL must use HTTP or HTTPS without credentials.');
      }
      const column = textColumns[key as keyof typeof textColumns];
      patch[column] = text || (['name', 'category', 'city', 'district', 'state', 'country'].includes(key) ? '' : null);
    } else if (Object.hasOwn(numericColumns, key)) {
      if (raw !== null && (typeof raw !== 'number' || !Number.isFinite(raw))) fail(`${key} must be a finite number.`);
      const number = raw as number | null;
      if (number !== null) {
        if (key === 'lat' && (number < -90 || number > 90)) fail('Latitude must be between -90 and 90.');
        if (key === 'lng' && (number < -180 || number > 180)) fail('Longitude must be between -180 and 180.');
        if (key === 'deliveryRadiusKm' && (number <= 0 || number > 50)) fail('Delivery radius must be above 0 and no more than 50 km.');
        if (key === 'avgPrepMinutes' && (!Number.isInteger(number) || number < 0 || number > 1440)) fail('Preparation time must be a whole number from 0 to 1440.');
      }
      patch[numericColumns[key as keyof typeof numericColumns]] = number;
    } else if (Object.hasOwn(booleanColumns, key)) {
      if (typeof raw !== 'boolean') fail(`${key} must be true or false.`);
      patch[booleanColumns[key as keyof typeof booleanColumns]] = raw as boolean;
    } else fail(`Unsupported store field: ${key}.`);
  }
  if (!Object.keys(patch).length) fail('No store changes supplied.');
  return patch;
}
export function validateMergedStore(store: Record<string, unknown>, patch: Record<string, unknown>): void {
  const merged = { ...store, ...patch };
  if (Object.hasOwn(patch, 'category') && merged.category === 'Pharmacy' && !merged.drug_license_number) fail('Add a drug licence before changing the category to Pharmacy.');
  if ((merged.lat == null) !== (merged.lng == null)) fail('Set both latitude and longitude, or clear both.');
}
