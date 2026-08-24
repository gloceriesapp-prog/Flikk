// Store onboarding — the real document set a kirana/pharmacy store needs
// before it can legally list on Flikk (see AddStoreModal's own note for the
// per-document rationale). Same "copy of the backend rule, not a second
// invented one" caveat as lib/productValidation.ts — this dashboard writes
// straight to Supabase with the service-role key (app/api/stores/*) since
// there's no admin login flow yet.

export interface StoreWriteInput {
  name: string;
  category: string;
  ownerName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  openTime: string;
  closeTime: string;
  photoUrl?: string | null;
  // Legally mandatory for any food/grocery business in India — Basic
  // FSSAI registration at minimum, State License above ₹12L turnover.
  fssaiNumber: string;
  // Local municipal registration — standard for any physical shop.
  shopEstablishmentNumber: string;
  panNumber: string;
  aadhaarLast4: string;
  bankName: string;
  bankAccountLast4: string;
  // GSTIN is only mandatory once turnover crosses ₹40L — legitimately
  // exempt below that, so it's conditional, not always-required.
  turnoverExceedsGstThreshold: boolean;
  gstNumber?: string | null;
  // Pharmacy only — a separately regulated, stricter path (state Drug
  // Control authority, tied to a registered pharmacist).
  drugLicenseNumber?: string | null;
}

function required(value: string | undefined | null, label: string): asserts value is string {
  if (!value || !value.trim()) throw new Error(`${label} is required.`);
}

export function validateStoreInput(input: Partial<StoreWriteInput>): asserts input is StoreWriteInput {
  required(input.name, 'Store name');
  required(input.category, 'Category');
  required(input.ownerName, "Owner's name");
  required(input.phone, 'Phone number');
  required(input.addressLine, 'Address');
  required(input.city, 'City');
  required(input.state, 'State');
  required(input.country, 'Country');
  required(input.openTime, 'Opening time');
  required(input.closeTime, 'Closing time');
  required(input.fssaiNumber, 'FSSAI license/registration number');
  required(input.shopEstablishmentNumber, 'Shop & Establishment license number');
  required(input.panNumber, "Owner's PAN");
  required(input.aadhaarLast4, "Owner's Aadhaar");
  required(input.bankName, 'Bank name');
  required(input.bankAccountLast4, 'Bank account details');

  if (input.turnoverExceedsGstThreshold) {
    required(input.gstNumber, 'GSTIN (required once turnover exceeds ₹40L)');
  }
  if (input.category === 'Pharmacy') {
    required(input.drugLicenseNumber, 'Drug License number');
  }
}

export interface StoreRow {
  name: string;
  category: string;
  owner_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  district: string;
  open_time: string;
  close_time: string;
  photo_url: string | null;
  fssai_number: string;
  shop_establishment_number: string;
  pan_number: string;
  aadhaar_last4: string;
  bank_name: string;
  bank_account_last4: string;
  turnover_exceeds_gst_threshold: boolean;
  gst_number: string | null;
  drug_license_number: string | null;
  is_active: boolean;
}

export function toStoreRow(input: StoreWriteInput): StoreRow {
  return {
    name: input.name.trim(),
    category: input.category,
    owner_name: input.ownerName.trim(),
    phone: input.phone.trim(),
    address_line: input.addressLine.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    country: input.country.trim(),
    // district is the pre-existing column stores/[id] and the customer app
    // already read before this onboarding form existed — city is the closer
    // real-world fit for it now that a real address exists.
    district: input.city.trim(),
    open_time: input.openTime.trim(),
    close_time: input.closeTime.trim(),
    photo_url: input.photoUrl?.trim() || null,
    fssai_number: input.fssaiNumber.trim(),
    shop_establishment_number: input.shopEstablishmentNumber.trim(),
    pan_number: input.panNumber.trim(),
    aadhaar_last4: input.aadhaarLast4.trim(),
    bank_name: input.bankName.trim(),
    bank_account_last4: input.bankAccountLast4.trim(),
    turnover_exceeds_gst_threshold: input.turnoverExceedsGstThreshold,
    gst_number: input.turnoverExceedsGstThreshold ? input.gstNumber?.trim() || null : null,
    drug_license_number: input.category === 'Pharmacy' ? input.drugLicenseNumber?.trim() || null : null,
    is_active: true,
  };
}
