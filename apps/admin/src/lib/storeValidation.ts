import { validateStoreFields } from '../../../../backend/src/stores/validation';
// Admin "Add store" — creates a live store for an existing Gloceries
// account, the same end state as approving a partner application
// (app/api/approvals/stores/[userId]/route.ts): a stores row owned by that
// user, the user flipped to role store_owner + is_approved. stores.owner_user_id
// is NOT NULL (001_init.sql), so the owner is looked up by phone; the owner
// must have signed in once (any Gloceries app) so their account exists.
// lat/lng are required: without a map pin the store is invisible to
// customers (nearby discovery sorts and filters by distance from it).
// Payout details are not collected here — set them on the store page (the
// real payout_* columns) or let the partner add them in the partner app.

export interface StoreWriteInput {
  name: string;
  category: string;
  ownerName: string;
  // The owner's login phone (users.phone) — required, used to find the account.
  ownerPhone: string;
  // Optional storefront contact number (stores.phone).
  phone?: string | null;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  openTime: string;
  closeTime: string;
  photoUrl?: string | null;
  fssaiNumber: string;
  shopEstablishmentNumber: string;
  panNumber: string;
  gstNumber?: string | null;
  udyamNumber?: string | null;
  // Pharmacy only — a separately regulated, stricter path.
  drugLicenseNumber?: string | null;
  // Needed only when more than one zone is active.
  zoneId?: string | null;
}

function required(value: string | undefined | null, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
}


// Same canonical form the backend writes at OTP verify (lib/phone.ts):
// +91 followed by the 10-digit local number. Null when not a valid number.
export function normalizeOwnerPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return local.length === 10 ? `+91${local}` : null;
}

export function ownerPhoneVariants(canonical: string): string[] {
  const local = canonical.slice(3);
  return [canonical, `91${local}`, local];
}

export function validateStoreInput(input: Partial<StoreWriteInput>): asserts input is StoreWriteInput {
  validateStoreFields({ name: input.name, category: input.category, owner_name: input.ownerName, address_line: input.addressLine, city: input.city, state: input.state, country: input.country, lat: input.lat, lng: input.lng, open_time: input.openTime, close_time: input.closeTime, photo_url: input.photoUrl ?? null, pan_number: input.panNumber, fssai_number: input.fssaiNumber });
  required(input.name, 'Store name');
  required(input.category, 'Category');
  required(input.ownerName, "Owner's name");
  required(input.ownerPhone, "Owner's phone number");
  if (!normalizeOwnerPhone(input.ownerPhone)) throw new Error("Enter the owner's 10-digit mobile number.");
  required(input.addressLine, 'Address');
  required(input.city, 'City');
  required(input.state, 'State');
  required(input.country, 'Country');
  if (typeof input.lat !== 'number' || !Number.isFinite(input.lat) || input.lat < -90 || input.lat > 90 ||
    typeof input.lng !== 'number' || !Number.isFinite(input.lng) || input.lng < -180 || input.lng > 180) {
    throw new Error('Store location (latitude and longitude) is required — without it customers cannot find the store.');
  }
  required(input.openTime, 'Opening time');
  required(input.closeTime, 'Closing time');
  required(input.fssaiNumber, 'FSSAI license/registration number');
  required(input.shopEstablishmentNumber, 'Shop & Establishment license number');
  required(input.panNumber, "Owner's PAN");
  if (input.category === 'Pharmacy') required(input.drugLicenseNumber, 'Drug License number');
}

export interface StoreRow {
  owner_user_id: string;
  zone_id: string;
  name: string;
  category: string;
  owner_name: string;
  phone: string | null;
  address_line: string;
  city: string;
  state: string;
  country: string;
  district: string;
  lat: number;
  lng: number;
  open_time: string;
  close_time: string;
  photo_url: string | null;
  fssai_number: string;
  shop_establishment_number: string;
  pan_number: string;
  gst_number: string | null;
  udyam_number: string | null;
  drug_license_number: string | null;
  is_active: boolean;
}

export function toStoreRow(input: StoreWriteInput, ownerUserId: string, zoneId: string): StoreRow {
  return {
    owner_user_id: ownerUserId,
    zone_id: zoneId,
    name: input.name.trim(),
    category: input.category,
    owner_name: input.ownerName.trim(),
    phone: input.phone?.trim() || null,
    address_line: input.addressLine.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    country: input.country.trim(),
    // district is the pre-existing column stores/[id] and the customer app
    // already read — city is the closer real-world fit for it.
    district: input.city.trim(),
    lat: input.lat,
    lng: input.lng,
    open_time: input.openTime.trim(),
    close_time: input.closeTime.trim(),
    photo_url: input.photoUrl?.trim() || null,
    fssai_number: input.fssaiNumber.trim(),
    shop_establishment_number: input.shopEstablishmentNumber.trim(),
    pan_number: input.panNumber.trim().toUpperCase(),
    gst_number: input.gstNumber?.trim() || null,
    udyam_number: input.udyamNumber?.trim() || null,
    drug_license_number: input.category === 'Pharmacy' ? input.drugLicenseNumber?.trim() || null : null,
    is_active: true,
  };
}
