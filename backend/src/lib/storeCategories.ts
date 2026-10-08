// The store categories a partner may pick — the exact set the admin panel
// allows (apps/admin/src/lib/store-options.ts STORE_CATEGORIES, which admin's
// own store editor and Add Store validate against; storeCategories.test.ts
// keeps the two lists identical). Served to the partner app/dashboard by
// GET /partner/store-categories so their pickers use the server's list, and
// enforced on onboarding (draft + submit), store edits and admin approval.
// Pharmacy is separately regulated: it needs a drug licence number.
import { AppError } from './errors.js';

export const STORE_CATEGORIES = [
  'Kirana & Grocery',
  'Supermarket',
  'Pharmacy',
  'Bakery',
  'Fruits & Vegetables',
  'Hardware',
  'Paint Shop',
  'Steel & Vessels',
  'General Store',
  'Others',
] as const;

export const DRUG_LICENSE_CATEGORIES: readonly string[] = ['Pharmacy'];
const MAX_LICENSE_LENGTH = 100;

export function storeCategoryOptions() {
  return STORE_CATEGORIES.map((name) => ({ name, requires_drug_license: DRUG_LICENSE_CATEGORIES.includes(name) }));
}

export function isStoreCategory(value: unknown): value is (typeof STORE_CATEGORIES)[number] {
  return typeof value === 'string' && (STORE_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeDrugLicense(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new AppError(400, 'INVALID_DRUG_LICENSE', 'Drug licence number must be text.');
  const trimmed = value.trim();
  if (trimmed.length > MAX_LICENSE_LENGTH) throw new AppError(400, 'INVALID_DRUG_LICENSE', 'Drug licence number is too long.');
  return trimmed || null;
}

// category: the category being saved; drugLicense: the licence the store
// will hold after the save (incoming value, else the one already on file).
export function assertStoreCategory(category: unknown, drugLicense: string | null): void {
  if (!isStoreCategory(category)) {
    throw new AppError(400, 'INVALID_CATEGORY', `Choose a store category from the list: ${STORE_CATEGORIES.join(', ')}.`);
  }
  if (DRUG_LICENSE_CATEGORIES.includes(category) && !drugLicense) {
    throw new AppError(400, 'DRUG_LICENSE_REQUIRED', 'A pharmacy needs a drug licence number (state Drug Control authority).');
  }
}
